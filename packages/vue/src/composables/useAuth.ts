import { ref, readonly, computed, inject, type Ref, type ComputedRef } from "vue";
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
 * Injection key for auth composable
 */
export const AUTH_KEY = Symbol("auth");

/**
 * Auth composable return type
 */
export interface AuthComposable<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Whether user is authenticated */
  isAuthenticated: ComputedRef<boolean>;
  /** Whether auth is loading */
  isLoading: Ref<boolean>;
  /** Decoded JWT */
  jwt: Ref<TJwt | null>;
  /** User data */
  user: Ref<TUser | null>;
  /** Auth error */
  error: Ref<AuthError | null>;
  /** Start login flow */
  login: (options?: AuthorizeOptions) => void;
  /** Logout user */
  logout: (options?: LogoutOptions) => void;
  /** Get access token */
  getAccessToken: () => Promise<string | null>;
  /** OAuth client instance */
  client: OAuthClient<TJwt, TUser>;
}

/**
 * Configuration for createAuth
 */
export interface CreateAuthConfig<
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
 * Create auth composable instance
 *
 * @example
 * ```ts
 * // In your main.ts or App.vue setup
 * import { createAuth } from '@auth-code-pkce/vue';
 * import { okta } from '@auth-code-pkce/core/providers';
 *
 * const auth = createAuth({
 *   provider: okta({
 *     issuer: 'https://dev-123456.okta.com',
 *     clientId: 'your-client-id',
 *     redirectUri: 'https://yourapp.com/callback',
 *   }),
 * });
 *
 * // Provide to app
 * app.provide(AUTH_KEY, auth);
 * ```
 */
export function createAuth<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(config: CreateAuthConfig<TJwt, TUser>): AuthComposable<TJwt, TUser> {
  const isLoading = ref(true);
  const jwt = ref<TJwt | null>(null) as Ref<TJwt | null>;
  const user = ref<TUser | null>(null) as Ref<TUser | null>;
  const error = ref<AuthError | null>(null);

  const isAuthenticated = computed(() => jwt.value !== null);

  const client = createOAuthClient<TJwt, TUser>({
    provider: config.provider,
    storage: config.storage ?? createDefaultStorageConfig(),
    httpClient: config.httpClient ?? createFetchHttpClient(),
    getUser: config.getUser,
    onAuthStateChange: (state: AuthState<TJwt, TUser>) => {
      isLoading.value = state.isLoading;
      jwt.value = state.jwt;
      user.value = state.user;
      error.value = state.error;
    },
    onError: config.onError,
  });

  // Initialize client
  client.initialize();

  const login = (options?: AuthorizeOptions) => {
    client.authorize(options);
  };

  const logout = (options?: LogoutOptions) => {
    client.logout(options);
  };

  const getAccessToken = () => client.getAccessToken();

  return {
    isAuthenticated,
    isLoading: readonly(isLoading) as Ref<boolean>,
    jwt: readonly(jwt) as Ref<TJwt | null>,
    user: readonly(user) as Ref<TUser | null>,
    error: readonly(error) as Ref<AuthError | null>,
    login,
    logout,
    getAccessToken,
    client,
  };
}

/**
 * Use auth composable in components
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAuth } from '@auth-code-pkce/vue';
 *
 * const { isAuthenticated, user, login, logout } = useAuth();
 * </script>
 *
 * <template>
 *   <div v-if="isAuthenticated">
 *     <p>Welcome, {{ user?.name }}</p>
 *     <button @click="logout()">Logout</button>
 *   </div>
 *   <button v-else @click="login()">Login</button>
 * </template>
 * ```
 */
export function useAuth<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(): AuthComposable<TJwt, TUser> {
  const auth = inject<AuthComposable<TJwt, TUser>>(AUTH_KEY);

  if (!auth) {
    throw new Error(
      "useAuth must be used within a component that has auth provided. " +
        "Make sure to call app.provide(AUTH_KEY, createAuth(...)) in your app setup."
    );
  }

  return auth;
}
