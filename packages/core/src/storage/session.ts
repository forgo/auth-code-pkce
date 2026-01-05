import type { StorageAdapter } from "../types/storage.js";

const DEFAULT_NAMESPACE = "@auth-code-pkce";

/**
 * Create a sessionStorage-based storage adapter
 *
 * SessionStorage is recommended for token storage because:
 * - Data is cleared when the tab/window is closed
 * - Data is not shared between tabs
 * - More secure than localStorage for sensitive tokens
 *
 * @param namespace Prefix for storage keys (default: "@auth-code-pkce")
 * @returns StorageAdapter instance
 */
export function createSessionStorageAdapter(
  namespace: string = DEFAULT_NAMESPACE
): StorageAdapter {
  const getKey = (key: string) => `${namespace}::${key}`;

  return {
    get(key: string): string | null {
      try {
        return sessionStorage.getItem(getKey(key));
      } catch {
        return null;
      }
    },

    set(key: string, value: string): void {
      try {
        sessionStorage.setItem(getKey(key), value);
      } catch {
        // Storage may be full or disabled
      }
    },

    remove(key: string): void {
      try {
        sessionStorage.removeItem(getKey(key));
      } catch {
        // Ignore errors
      }
    },

    clear(): void {
      try {
        const prefix = `${namespace}::`;
        const keys = Object.keys(sessionStorage);
        for (const key of keys) {
          if (key.startsWith(prefix)) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore errors
      }
    },
  };
}
