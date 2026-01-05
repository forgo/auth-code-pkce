import type { ProviderConfig } from "../types/provider.js";
import type { StorageConfig } from "../types/storage.js";
import type { HttpClient } from "../types/http.js";
import type { TokenResponse, TokenState, AuthError } from "../types/oauth.js";
import { STORAGE_KEYS } from "../types/storage.js";
import { createAuthError } from "../types/oauth.js";
import { validateState } from "../crypto/state.js";
import { parseCallbackUrl } from "../utils/url.js";

/**
 * Token refresh coordinator
 *
 * Ensures only one token refresh happens at a time, preventing
 * the "thundering herd" problem when multiple requests get 401s
 * simultaneously.
 */
export class TokenRefreshCoordinator {
  private refreshPromise: Promise<TokenState | null> | null = null;

  /**
   * Coordinate token refresh - only one refresh runs at a time
   * Other callers wait for the same promise
   */
  async refresh(
    refreshFn: () => Promise<TokenState | null>
  ): Promise<TokenState | null> {
    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh and store promise
    this.refreshPromise = refreshFn().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /**
   * Check if refresh is in progress
   */
  isRefreshing(): boolean {
    return this.refreshPromise !== null;
  }
}

/**
 * Parse token response and calculate expiration
 */
export function parseTokenResponse(response: TokenResponse): TokenState {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    idToken: response.id_token ?? null,
    expiresAt: response.expires_in
      ? Date.now() + response.expires_in * 1000
      : null,
    scope: response.scope ?? null,
  };
}

/**
 * Store tokens in storage
 */
export function storeTokens(
  tokens: TokenState,
  storage: StorageConfig
): void {
  storage.tokenStorage.set(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
}

/**
 * Get tokens from storage
 */
export function getStoredTokens(storage: StorageConfig): TokenState | null {
  const stored = storage.tokenStorage.get(STORAGE_KEYS.TOKENS);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as TokenState;
  } catch {
    return null;
  }
}

/**
 * Clear all tokens and flow state from storage
 */
export function clearTokens(storage: StorageConfig): void {
  storage.tokenStorage.clear();
  storage.flowStorage.clear();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  provider: ProviderConfig,
  storage: StorageConfig,
  httpClient: HttpClient,
  url?: string
): Promise<{ tokens: TokenState; preAuthPath: string } | { error: AuthError }> {
  // Parse callback URL
  const { code, state, error, errorDescription } = parseCallbackUrl(url);

  // Check for OAuth error
  if (error) {
    return {
      error: createAuthError(
        "callback_error",
        errorDescription ?? error,
        { error, errorDescription }
      ),
    };
  }

  // Validate code exists
  if (!code) {
    return {
      error: createAuthError("callback_error", "No authorization code in callback URL"),
    };
  }

  // Validate state
  const storedState = storage.flowStorage.get(STORAGE_KEYS.STATE);
  if (!validateState(state, storedState)) {
    return {
      error: createAuthError(
        "invalid_state",
        "State parameter mismatch - possible CSRF attack"
      ),
    };
  }

  // Get stored code verifier
  const codeVerifier = storage.flowStorage.get(STORAGE_KEYS.CODE_VERIFIER);
  if (!codeVerifier) {
    return {
      error: createAuthError(
        "token_exchange_failed",
        "Code verifier not found in storage"
      ),
    };
  }

  // Get stored redirect URI
  const redirectUri =
    storage.flowStorage.get(STORAGE_KEYS.REDIRECT_URI) ?? provider.redirectUri;

  // Get pre-auth path before clearing flow storage
  const preAuthPath = storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH) ?? "/";

  // Check for repeated auth code (prevents replay)
  const previousCode = storage.flowStorage.get(STORAGE_KEYS.PREVIOUS_AUTH_CODE);
  if (previousCode === code) {
    return {
      error: createAuthError(
        "token_exchange_failed",
        "Authorization code already exchanged"
      ),
    };
  }

  // Store current code to prevent replay
  storage.flowStorage.set(STORAGE_KEYS.PREVIOUS_AUTH_CODE, code);

  // Build token request
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  try {
    const response = await httpClient.request<TokenResponse>({
      url: provider.endpoints.tokenEndpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (response.status !== 200) {
      return {
        error: createAuthError(
          "token_exchange_failed",
          `Token exchange failed with status ${response.status}`,
          response.data
        ),
      };
    }

    const tokens = parseTokenResponse(response.data);
    storeTokens(tokens, storage);

    // Clear flow state (except previous auth code)
    storage.flowStorage.remove(STORAGE_KEYS.CODE_VERIFIER);
    storage.flowStorage.remove(STORAGE_KEYS.STATE);
    storage.flowStorage.remove(STORAGE_KEYS.REDIRECT_URI);
    storage.flowStorage.remove(STORAGE_KEYS.PRE_AUTH_PATH);

    return { tokens, preAuthPath };
  } catch (err) {
    return {
      error: createAuthError(
        "network_error",
        "Failed to exchange authorization code",
        err
      ),
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  provider: ProviderConfig,
  storage: StorageConfig,
  httpClient: HttpClient
): Promise<TokenState | null> {
  const currentTokens = getStoredTokens(storage);

  if (!currentTokens?.refreshToken) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: provider.clientId,
    refresh_token: currentTokens.refreshToken,
    scope: provider.scopes.join(" "),
  });

  try {
    const response = await httpClient.request<TokenResponse>({
      url: provider.endpoints.tokenEndpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (response.status !== 200) {
      return null;
    }

    const tokens = parseTokenResponse(response.data);
    storeTokens(tokens, storage);

    return tokens;
  } catch {
    return null;
  }
}
