import React, {
  type ReactNode,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  ProviderConfig,
  StorageConfig,
  HttpClient,
  AuthState,
  JwtPayload,
  AuthError,
  AuthorizeOptions,
  LogoutOptions,
} from "@auth-code-pkce/core";
import {
  createOAuthClient,
  createDefaultStorageConfig,
  createFetchHttpClient,
} from "@auth-code-pkce/core";
import { AuthContext, type AuthContextValue } from "./context.js";

/**
 * Props for AuthProvider component
 */
export interface AuthProviderProps<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  /** Child components */
  children: ReactNode;

  /** OAuth provider configuration */
  provider: ProviderConfig;

  /** Optional storage configuration */
  storage?: StorageConfig;

  /** Optional HTTP client */
  httpClient?: HttpClient;

  /** Optional user fetching function */
  getUser?: (params: {
    accessToken: string;
    jwt: TJwt | null;
    httpClient: HttpClient;
  }) => Promise<TUser | null>;

  /** Loading component to show during initialization */
  loadingComponent?: ReactNode;

  /** Whether to auto-redirect to login if not authenticated */
  autoLogin?: boolean;

  /** Error handler */
  onError?: (error: AuthError) => void;

  /** Callback when tokens are refreshed */
  onTokenRefresh?: () => void;
}

/**
 * Auth provider component
 *
 * Wraps your application and provides authentication context.
 *
 * @example
 * ```tsx
 * import { AuthProvider } from '@auth-code-pkce/react';
 * import { okta } from '@auth-code-pkce/core/providers';
 *
 * const provider = okta({
 *   issuer: 'https://dev-123456.okta.com',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 *
 * function App() {
 *   return (
 *     <AuthProvider provider={provider}>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>({
  children,
  provider,
  storage,
  httpClient,
  getUser,
  loadingComponent = null,
  autoLogin = false,
  onError,
  onTokenRefresh,
}: AuthProviderProps<TJwt, TUser>): React.ReactNode {
  const [state, setState] = useState<AuthState<TJwt, TUser>>({
    isAuthenticated: false,
    isLoading: true,
    jwt: null,
    user: null,
    error: null,
  });

  // Create client once
  const client = useMemo(
    () =>
      createOAuthClient<TJwt, TUser>({
        provider,
        storage: storage ?? createDefaultStorageConfig(),
        httpClient: httpClient ?? createFetchHttpClient(),
        getUser,
        onAuthStateChange: setState,
        onError,
        onTokenRefresh,
      }),
    // Only recreate if provider identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider.clientId, provider.issuer]
  );

  // Initialize client on mount
  useEffect(() => {
    client.initialize().then(() => {
      const currentState = client.getState();
      if (autoLogin && !currentState.isAuthenticated && !currentState.isLoading) {
        client.authorize({ preservePath: true });
      }
    });
  }, [client, autoLogin]);

  // Memoized callbacks
  const login = useCallback(
    (options?: AuthorizeOptions) => {
      client.authorize(options);
    },
    [client]
  );

  const logout = useCallback(
    (options?: LogoutOptions) => {
      client.logout(options);
    },
    [client]
  );

  const getAccessToken = useCallback(() => client.getAccessToken(), [client]);

  // Build context value
  const contextValue = useMemo<AuthContextValue<TJwt, TUser>>(
    () => ({
      ...state,
      client,
      login,
      logout,
      getAccessToken,
    }),
    [state, client, login, logout, getAccessToken]
  );

  // Show loading component while initializing
  if (state.isLoading) {
    return <>{loadingComponent}</>;
  }

  return (
    <AuthContext.Provider value={contextValue as AuthContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
