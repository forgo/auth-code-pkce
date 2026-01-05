import type { ProviderConfig } from "../types/provider.js";
import type { StorageConfig } from "../types/storage.js";
import type { HttpClient } from "../types/http.js";
import type {
  AuthState,
  AuthError,
  JwtPayload,
  TokenState,
} from "../types/oauth.js";
import { createFetchHttpClient } from "../types/http.js";
import { createDefaultStorageConfig } from "../storage/index.js";
import { authorize, type AuthorizeOptions } from "./authorize.js";
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  getStoredTokens,
  clearTokens,
  TokenRefreshCoordinator,
} from "./token.js";
import { logout, type LogoutOptions } from "./logout.js";
import { isCallbackUrl, getCurrentOrigin } from "../utils/url.js";
import { decodeJwt } from "../utils/jwt.js";

/**
 * OAuth client configuration
 */
export interface OAuthClientConfig<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Provider configuration */
  provider: ProviderConfig;

  /** Storage configuration (default: session for tokens, local for flow) */
  storage?: StorageConfig;

  /** HTTP client (default: fetch-based) */
  httpClient?: HttpClient;

  /** Optional user fetching function */
  getUser?: (params: {
    accessToken: string;
    jwt: TJwt | null;
    httpClient: HttpClient;
  }) => Promise<TUser | null>;

  /** Callback when auth state changes */
  onAuthStateChange?: (state: AuthState<TJwt, TUser>) => void;

  /** Callback when tokens are refreshed */
  onTokenRefresh?: (tokens: TokenState) => void;

  /** Callback on authentication error */
  onError?: (error: AuthError) => void;
}

/**
 * OAuth client interface
 */
export interface OAuthClient<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Get current authentication state */
  getState(): AuthState<TJwt, TUser>;

  /** Initialize client (check for existing session, handle callback) */
  initialize(): Promise<void>;

  /** Start authorization flow */
  authorize(options?: AuthorizeOptions): void;

  /** Handle authorization callback (called automatically during initialize) */
  handleCallback(url?: string): Promise<void>;

  /** Refresh access token */
  refreshToken(): Promise<boolean>;

  /** Get current access token (refreshes if expired) */
  getAccessToken(): Promise<string | null>;

  /** Logout user */
  logout(options?: LogoutOptions): void;

  /** Subscribe to state changes */
  subscribe(listener: (state: AuthState<TJwt, TUser>) => void): () => void;
}

/**
 * Create an OAuth client instance
 */
export function createOAuthClient<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(config: OAuthClientConfig<TJwt, TUser>): OAuthClient<TJwt, TUser> {
  const {
    provider,
    storage = createDefaultStorageConfig(),
    httpClient = createFetchHttpClient(),
    getUser,
    onAuthStateChange,
    onTokenRefresh,
    onError,
  } = config;

  // State
  let state: AuthState<TJwt, TUser> = {
    isAuthenticated: false,
    isLoading: true,
    jwt: null,
    user: null,
    error: null,
  };

  // Listeners
  const listeners = new Set<(state: AuthState<TJwt, TUser>) => void>();

  // Token refresh coordinator
  const refreshCoordinator = new TokenRefreshCoordinator();

  // Idempotency tracking for StrictMode compatibility
  let initializePromise: Promise<void> | null = null;
  let isInitialized = false;
  let handleCallbackPromise: Promise<void> | null = null;

  // Helper to update state and notify listeners
  function setState(updates: Partial<AuthState<TJwt, TUser>>): void {
    state = { ...state, ...updates };
    for (const listener of listeners) {
      listener(state);
    }
    onAuthStateChange?.(state);
  }

  // Helper to handle errors
  function handleError(error: AuthError): void {
    setState({ error, isLoading: false });
    onError?.(error);
  }

  // Load user from tokens
  async function loadUserFromTokens(tokens: TokenState): Promise<void> {
    const jwt = tokens.idToken ? decodeJwt<TJwt>(tokens.idToken) : null;

    let user: TUser | null = null;
    if (getUser) {
      try {
        user = await getUser({
          accessToken: tokens.accessToken,
          jwt,
          httpClient,
        });
      } catch {
        // User fetch failed, but we still have tokens
      }
    }

    setState({
      isAuthenticated: true,
      isLoading: false,
      jwt,
      user,
      error: null,
    });
  }

  // The client object
  const client: OAuthClient<TJwt, TUser> = {
    getState(): AuthState<TJwt, TUser> {
      return state;
    },

    async initialize(): Promise<void> {
      // Idempotency: if already initialized, return immediately
      if (isInitialized) {
        return;
      }

      // Idempotency: if initialization is in progress, return the existing promise
      // This handles React StrictMode's double-mounting behavior
      if (initializePromise) {
        return initializePromise;
      }

      initializePromise = (async () => {
        // Check if this is a callback URL
        if (isCallbackUrl(provider.redirectUri)) {
          await client.handleCallback();
          return;
        }

        // Check for existing tokens
        const tokens = getStoredTokens(storage);
        if (tokens) {
          // Check if access token is expired
          if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
            // Try to refresh
            const refreshed = await client.refreshToken();
            if (!refreshed) {
              // Refresh failed, clear tokens
              clearTokens(storage);
              setState({ isLoading: false });
              return;
            }
          } else {
            // Tokens are valid
            await loadUserFromTokens(tokens);
            return;
          }
        }

        // No tokens
        setState({ isLoading: false });
      })();

      try {
        await initializePromise;
        isInitialized = true;
      } finally {
        initializePromise = null;
      }
    },

    authorize(options?: AuthorizeOptions): void {
      authorize(provider, storage, options);
    },

    async handleCallback(url?: string): Promise<void> {
      // Idempotency: if already authenticated, skip
      // This handles React StrictMode's double-mounting behavior
      if (state.isAuthenticated) {
        return;
      }

      // Idempotency: if callback handling is in progress, return existing promise
      if (handleCallbackPromise) {
        return handleCallbackPromise;
      }

      handleCallbackPromise = (async () => {
        setState({ isLoading: true });

        const result = await exchangeCodeForTokens(
          provider,
          storage,
          httpClient,
          url
        );

        if ("error" in result) {
          handleError(result.error);
          return;
        }

        await loadUserFromTokens(result.tokens);

        // Redirect to pre-auth path
        if (typeof window !== "undefined") {
          const redirectPath = result.preAuthPath || "/";
          window.history.replaceState(
            null,
            "",
            `${getCurrentOrigin()}${redirectPath}`
          );
        }
      })();

      try {
        await handleCallbackPromise;
      } finally {
        handleCallbackPromise = null;
      }
    },

    async refreshToken(): Promise<boolean> {
      const tokens = await refreshCoordinator.refresh(() =>
        refreshAccessToken(provider, storage, httpClient)
      );

      if (tokens) {
        await loadUserFromTokens(tokens);
        onTokenRefresh?.(tokens);
        return true;
      }

      return false;
    },

    async getAccessToken(): Promise<string | null> {
      const tokens = getStoredTokens(storage);

      if (!tokens) {
        return null;
      }

      // Check if token is expired or about to expire (within 60 seconds)
      const expirationBuffer = 60 * 1000; // 60 seconds
      if (tokens.expiresAt && tokens.expiresAt - expirationBuffer < Date.now()) {
        const refreshed = await client.refreshToken();
        if (!refreshed) {
          return null;
        }
        const newTokens = getStoredTokens(storage);
        return newTokens?.accessToken ?? null;
      }

      return tokens.accessToken;
    },

    logout(options?: LogoutOptions): void {
      logout(provider, storage, options);

      setState({
        isAuthenticated: false,
        jwt: null,
        user: null,
        error: null,
      });
    },

    subscribe(listener: (state: AuthState<TJwt, TUser>) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return client;
}
