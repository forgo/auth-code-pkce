import type { StorageConfig } from "../types/storage.js";
import { createSessionStorageAdapter } from "./session.js";
import { createLocalStorageAdapter } from "./local.js";
import { createMemoryStorageAdapter } from "./memory.js";

export { createSessionStorageAdapter } from "./session.js";
export { createLocalStorageAdapter } from "./local.js";
export { createMemoryStorageAdapter } from "./memory.js";

/**
 * Create the default storage configuration
 *
 * Default configuration:
 * - Tokens are stored in sessionStorage (more secure, cleared on tab close)
 * - OAuth flow state is stored in localStorage (survives OAuth redirect)
 *
 * @returns StorageConfig with default adapters
 */
export function createDefaultStorageConfig(): StorageConfig {
  return {
    tokenStorage: createSessionStorageAdapter(),
    flowStorage: createLocalStorageAdapter(),
  };
}

/**
 * Create a memory-only storage configuration
 *
 * Useful for SSR or testing environments where browser storage isn't available.
 *
 * @returns StorageConfig with memory adapters
 */
export function createMemoryStorageConfig(): StorageConfig {
  return {
    tokenStorage: createMemoryStorageAdapter(),
    flowStorage: createMemoryStorageAdapter(),
  };
}
