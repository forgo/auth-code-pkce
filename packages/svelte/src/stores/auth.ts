import { writable, derived, type Readable } from "svelte/store";
import type {
  ProviderConfig,
  StorageConfig,
  HttpClient,
  AuthState,
  AuthError,
  JwtPayload,
  OAuthClient,
  AuthorizeOptions,
  LogoutOptions,
} from "@auth-code-pkce/core";
import {
  createOAuthClient,
  createDefaultStorageConfig,
  createFetchHttpClient,
} from "@auth-code-pkce/core";

/**
 * Auth store interface
 */
export interface AuthStore<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Subscribe to auth state */
  subscribe: Readable<AuthState<TJwt, TUser>>["subscribe"];
  /** Start login flow */
  login: (options?: AuthorizeOptions) => void;
  /** Logout user */
  logout: (options?: LogoutOptions) => void;
  /** Get access token */
  getAccessToken: () => Promise<string | null>;
  /** Refresh token */
  refreshToken: () => Promise<boolean>;
  /** OAuth client instance */
  client: OAuthClient<TJwt, TUser>;
}

/**
 * Configuration for createAuthStore
 */
export interface AuthStoreConfig<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Provider configuration */
  provider: ProviderConfig;
  /** Storage configuration */
  storage?: StorageConfig;
  /** HTTP client */
  httpClient?: HttpClient;
  /** User fetching function */
  getUser?: (params: {
    accessToken: string;
    jwt: TJwt | null;
    httpClient: HttpClient;
  }) => Promise<TUser | null>;
  /** Error handler */
  onError?: (error: AuthError) => void;
}

/**
 * Create auth store
 *
 * @example
 * ```ts
 * // stores/auth.ts
 * import { createAuthStore } from '@auth-code-pkce/svelte';
 * import { okta } from '@auth-code-pkce/core/providers';
 *
 * export const auth = createAuthStore({
 *   provider: okta({
 *     issuer: 'https://dev-123456.okta.com',
 *     clientId: 'your-client-id',
 *     redirectUri: 'https://yourapp.com/callback',
 *   }),
 * });
 * ```
 */
export function createAuthStore<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(config: AuthStoreConfig<TJwt, TUser>): AuthStore<TJwt, TUser> {
  // Create writable store for state
  const state = writable<AuthState<TJwt, TUser>>({
    isAuthenticated: false,
    isLoading: true,
    jwt: null,
    user: null,
    error: null,
  });

  // Create OAuth client
  const client = createOAuthClient<TJwt, TUser>({
    provider: config.provider,
    storage: config.storage ?? createDefaultStorageConfig(),
    httpClient: config.httpClient ?? createFetchHttpClient(),
    getUser: config.getUser,
    onAuthStateChange: (newState) => {
      state.set(newState);
    },
    onError: config.onError,
  });

  // Initialize client
  client.initialize();

  return {
    subscribe: state.subscribe,
    login: (options) => client.authorize(options),
    logout: (options) => client.logout(options),
    getAccessToken: () => client.getAccessToken(),
    refreshToken: () => client.refreshToken(),
    client,
  };
}

/**
 * Derived stores for convenience
 */
export interface DerivedAuthStores<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Whether user is authenticated */
  isAuthenticated: Readable<boolean>;
  /** Whether auth is loading */
  isLoading: Readable<boolean>;
  /** User data */
  user: Readable<TUser | null>;
  /** Decoded JWT */
  jwt: Readable<TJwt | null>;
  /** Auth error */
  error: Readable<AuthError | null>;
}

/**
 * Create derived stores from auth store
 *
 * @example
 * ```ts
 * import { auth } from './stores/auth';
 * import { createDerivedStores } from '@auth-code-pkce/svelte';
 *
 * export const { isAuthenticated, isLoading, user, jwt, error } = createDerivedStores(auth);
 * ```
 */
export function createDerivedStores<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(authStore: AuthStore<TJwt, TUser>): DerivedAuthStores<TJwt, TUser> {
  return {
    isAuthenticated: derived(authStore, ($auth) => $auth.isAuthenticated),
    isLoading: derived(authStore, ($auth) => $auth.isLoading),
    user: derived(authStore, ($auth) => $auth.user),
    jwt: derived(authStore, ($auth) => $auth.jwt),
    error: derived(authStore, ($auth) => $auth.error),
  };
}
