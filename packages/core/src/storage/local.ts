import type { StorageAdapter } from "../types/storage.js";

const DEFAULT_NAMESPACE = "@auth-code-pkce";

/**
 * Create a localStorage-based storage adapter
 *
 * LocalStorage is used for OAuth flow state because:
 * - Data persists across browser redirects (needed for OAuth callback)
 * - Data persists across sessions
 *
 * Note: Don't use for token storage as it's less secure than sessionStorage
 *
 * @param namespace Prefix for storage keys (default: "@auth-code-pkce")
 * @returns StorageAdapter instance
 */
export function createLocalStorageAdapter(
  namespace: string = DEFAULT_NAMESPACE
): StorageAdapter {
  const getKey = (key: string) => `${namespace}::${key}`;

  return {
    get(key: string): string | null {
      try {
        return localStorage.getItem(getKey(key));
      } catch {
        return null;
      }
    },

    set(key: string, value: string): void {
      try {
        localStorage.setItem(getKey(key), value);
      } catch {
        // Storage may be full or disabled
      }
    },

    remove(key: string): void {
      try {
        localStorage.removeItem(getKey(key));
      } catch {
        // Ignore errors
      }
    },

    clear(): void {
      try {
        const prefix = `${namespace}::`;
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore errors
      }
    },
  };
}
