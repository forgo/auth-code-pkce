import { createContext } from "react";
import type {
  AuthState,
  JwtPayload,
  OAuthClient,
  AuthorizeOptions,
  LogoutOptions,
} from "@auth-code-pkce/core";

/**
 * Auth context value exposed to consumers
 */
export interface AuthContextValue<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> extends AuthState<TJwt, TUser> {
  /** OAuth client instance for advanced usage */
  client: OAuthClient<TJwt, TUser>;

  /** Start login flow */
  login: (options?: AuthorizeOptions) => void;

  /** Logout user */
  logout: (options?: LogoutOptions) => void;

  /** Get current access token (refreshes if needed) */
  getAccessToken: () => Promise<string | null>;
}

/**
 * React context for authentication state
 */
export const AuthContext = createContext<AuthContextValue<
  JwtPayload,
  unknown
> | null>(null);
