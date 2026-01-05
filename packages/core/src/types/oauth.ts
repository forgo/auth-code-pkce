/**
 * Standard OAuth 2.0 token response from the authorization server
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

/**
 * Parsed/stored token state for internal use
 */
export interface TokenState {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number | null;
  scope: string | null;
}

/**
 * OAuth flow state stored during authorization redirect
 */
export interface OAuthFlowState {
  codeVerifier: string;
  state: string;
  redirectUri: string;
  preAuthPath?: string;
  nonce?: string;
}

/**
 * Generic JWT payload with standard claims
 */
export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

/**
 * Error codes for authentication errors
 */
export type AuthErrorCode =
  | "invalid_state"
  | "token_exchange_failed"
  | "token_refresh_failed"
  | "invalid_token"
  | "network_error"
  | "storage_error"
  | "configuration_error"
  | "callback_error";

/**
 * Structured authentication error
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Authentication state exposed to consumers
 */
export interface AuthState<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
> {
  isAuthenticated: boolean;
  isLoading: boolean;
  jwt: TJwt | null;
  user: TUser | null;
  error: AuthError | null;
}

/**
 * Create an AuthError with the given code and message
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  details?: unknown
): AuthError {
  return { code, message, details };
}
