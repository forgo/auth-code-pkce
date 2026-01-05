/**
 * Storage adapter interface for pluggable storage backends
 *
 * Implement this interface to use custom storage (e.g., encrypted storage,
 * React Native AsyncStorage, etc.)
 */
export interface StorageAdapter {
  /**
   * Get a value by key
   * @param key Storage key
   * @returns Stored value or null if not found
   */
  get(key: string): string | null;

  /**
   * Set a value by key
   * @param key Storage key
   * @param value Value to store
   */
  set(key: string, value: string): void;

  /**
   * Remove a value by key
   * @param key Storage key
   */
  remove(key: string): void;

  /**
   * Clear all values managed by this adapter
   */
  clear(): void;
}

/**
 * Storage keys used by the library
 */
export const STORAGE_KEYS = {
  /** Token storage (access, refresh, id tokens) */
  TOKENS: "tokens",
  /** PKCE code verifier */
  CODE_VERIFIER: "codeVerifier",
  /** OAuth state parameter */
  STATE: "state",
  /** Redirect URI used for the current flow */
  REDIRECT_URI: "redirectUri",
  /** Path to restore after authentication */
  PRE_AUTH_PATH: "preAuthPath",
  /** Previously exchanged auth code (prevents replay) */
  PREVIOUS_AUTH_CODE: "previousAuthCode",
} as const;

/**
 * Storage configuration for different storage needs
 *
 * Design decision: Separate token storage from flow state storage
 * - Tokens: sessionStorage by default (more secure, cleared on tab close)
 * - Flow state: localStorage by default (survives OAuth redirect)
 */
export interface StorageConfig {
  /** Storage for tokens (accessToken, refreshToken, idToken) */
  tokenStorage: StorageAdapter;

  /** Storage for OAuth flow state (verifier, state, pre-auth path) */
  flowStorage: StorageAdapter;
}
