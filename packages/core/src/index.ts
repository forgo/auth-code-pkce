// Types
export type {
  TokenResponse,
  TokenState,
  OAuthFlowState,
  JwtPayload,
  AuthErrorCode,
  AuthError,
  AuthState,
} from "./types/index.js";
export { createAuthError } from "./types/index.js";

export type {
  ProviderEndpoints,
  ProviderConfig,
  ProviderPresetConfig,
  ProviderPreset,
} from "./types/index.js";

export type { StorageAdapter, StorageConfig } from "./types/index.js";
export { STORAGE_KEYS } from "./types/index.js";

export type {
  HttpRequest,
  HttpResponse,
  HttpClient,
  TokenInjector,
} from "./types/index.js";
export { bearerTokenInjector, createFetchHttpClient } from "./types/index.js";

// Crypto
export type { PKCEPair } from "./crypto/index.js";
export {
  bytesToBase64,
  base64ToBytes,
  bytesToBase64Url,
  base64encode,
  base64decode,
  sha256,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  PKCE_CHALLENGE_METHOD,
  generateState,
  validateState,
} from "./crypto/index.js";

// Storage
export {
  createSessionStorageAdapter,
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createDefaultStorageConfig,
  createMemoryStorageConfig,
} from "./storage/index.js";

// Utils
export { decodeJwt, isTokenExpired } from "./utils/index.js";
export {
  parseCallbackUrl,
  isCallbackUrl,
  buildUrl,
  getCurrentPath,
  getCurrentOrigin,
} from "./utils/index.js";

// OAuth Client
export type { OAuthClientConfig, OAuthClient } from "./oauth/index.js";
export { createOAuthClient } from "./oauth/index.js";

export type { AuthorizeOptions, LogoutOptions } from "./oauth/index.js";
export {
  buildAuthorizationUrl,
  authorize,
  getAndClearPreAuthPath,
  TokenRefreshCoordinator,
  parseTokenResponse,
  storeTokens,
  getStoredTokens,
  clearTokens,
  exchangeCodeForTokens,
  refreshAccessToken,
  buildLogoutUrl,
  logout,
} from "./oauth/index.js";

// Providers
export {
  okta,
  auth0,
  keycloak,
  authentik,
  generic,
} from "./providers/index.js";
