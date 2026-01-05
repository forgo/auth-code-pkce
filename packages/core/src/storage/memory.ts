import type { StorageAdapter } from "../types/storage.js";

/**
 * Create an in-memory storage adapter
 *
 * Memory storage is useful for:
 * - Server-side rendering (SSR) where browser storage isn't available
 * - Testing environments
 * - Situations where persistence isn't needed
 *
 * Note: Data is lost when the page is refreshed or navigated away
 *
 * @returns StorageAdapter instance
 */
export function createMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, string>();

  return {
    get(key: string): string | null {
      return store.get(key) ?? null;
    },

    set(key: string, value: string): void {
      store.set(key, value);
    },

    remove(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
}
