import type { ProviderConfig } from "../types/provider.js";
import type { StorageConfig } from "../types/storage.js";
import { clearTokens, getStoredTokens } from "./token.js";
import { buildUrl, getCurrentOrigin } from "../utils/url.js";

/**
 * Options for logout
 */
export interface LogoutOptions {
  /** Whether to redirect to the provider's logout endpoint */
  redirect?: boolean;
  /** Only clear local tokens, don't end session at provider */
  localOnly?: boolean;
}

/**
 * Build logout URL for the provider
 *
 * @param provider Provider configuration
 * @param idToken ID token for logout hint
 * @returns Logout URL or null if no logout endpoint
 */
export function buildLogoutUrl(
  provider: ProviderConfig,
  idToken: string | null
): string | null {
  if (!provider.endpoints.logoutEndpoint) {
    return null;
  }

  const params: Record<string, string | undefined> = {
    post_logout_redirect_uri:
      provider.postLogoutRedirectUri ?? getCurrentOrigin(),
  };

  // Include id_token_hint if available
  if (idToken) {
    params.id_token_hint = idToken;
  }

  return buildUrl(provider.endpoints.logoutEndpoint, params);
}

/**
 * Perform logout
 *
 * @param provider Provider configuration
 * @param storage Storage configuration
 * @param options Logout options
 */
export function logout(
  provider: ProviderConfig,
  storage: StorageConfig,
  options: LogoutOptions = {}
): void {
  const { redirect = true, localOnly = false } = options;

  // Get id token before clearing
  const tokens = getStoredTokens(storage);
  const idToken = tokens?.idToken ?? null;

  // Clear all stored tokens and flow state
  clearTokens(storage);

  // Redirect to provider logout if requested
  if (redirect && !localOnly && typeof window !== "undefined") {
    const logoutUrl = buildLogoutUrl(provider, idToken);
    if (logoutUrl) {
      window.location.replace(logoutUrl);
    }
  }
}
