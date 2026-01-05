import type { ProviderConfig } from "../types/provider.js";
import type { StorageConfig } from "../types/storage.js";
import type { OAuthFlowState } from "../types/oauth.js";
import { STORAGE_KEYS } from "../types/storage.js";
import { generatePKCEPair, PKCE_CHALLENGE_METHOD } from "../crypto/pkce.js";
import { generateState } from "../crypto/state.js";
import { buildUrl, getCurrentPath } from "../utils/url.js";

/**
 * Options for the authorize function
 */
export interface AuthorizeOptions {
  /** Whether to preserve the current path for post-login redirect */
  preservePath?: boolean;
  /** OAuth prompt parameter (login, consent, none) */
  prompt?: "login" | "consent" | "none";
  /** Additional parameters to include in the authorization URL */
  additionalParams?: Record<string, string>;
}

/**
 * Build authorization URL and store flow state
 *
 * @param provider Provider configuration
 * @param storage Storage configuration
 * @param options Authorization options
 * @returns Authorization URL to redirect to
 */
export function buildAuthorizationUrl(
  provider: ProviderConfig,
  storage: StorageConfig,
  options: AuthorizeOptions = {}
): string {
  // Generate PKCE pair
  const { codeVerifier, codeChallenge } = generatePKCEPair();

  // Generate random state for CSRF protection
  const state = generateState();

  // Store flow state for callback validation
  const flowState: OAuthFlowState = {
    codeVerifier,
    state,
    redirectUri: provider.redirectUri,
    preAuthPath: options.preservePath ? getCurrentPath() : undefined,
  };

  storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, flowState.codeVerifier);
  storage.flowStorage.set(STORAGE_KEYS.STATE, flowState.state);
  storage.flowStorage.set(STORAGE_KEYS.REDIRECT_URI, flowState.redirectUri);
  if (flowState.preAuthPath) {
    storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, flowState.preAuthPath);
  }

  // Build authorization URL
  const params: Record<string, string | undefined> = {
    client_id: provider.clientId,
    response_type: "code",
    scope: provider.scopes.join(" "),
    redirect_uri: provider.redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: PKCE_CHALLENGE_METHOD,
    state,
    prompt: options.prompt,
    ...provider.additionalAuthParams,
    ...options.additionalParams,
  };

  return buildUrl(provider.endpoints.authorizationEndpoint, params);
}

/**
 * Start authorization flow by redirecting to the authorization endpoint
 *
 * @param provider Provider configuration
 * @param storage Storage configuration
 * @param options Authorization options
 */
export function authorize(
  provider: ProviderConfig,
  storage: StorageConfig,
  options: AuthorizeOptions = {}
): void {
  const authUrl = buildAuthorizationUrl(provider, storage, options);

  if (typeof window !== "undefined") {
    window.location.replace(authUrl);
  }
}

/**
 * Get stored pre-auth path and clear it from storage
 *
 * @param storage Storage configuration
 * @returns Pre-auth path or "/" if not set
 */
export function getAndClearPreAuthPath(storage: StorageConfig): string {
  const path = storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH) ?? "/";
  storage.flowStorage.remove(STORAGE_KEYS.PRE_AUTH_PATH);
  return path;
}
