/**
 * Factory for creating provider initializers
 *
 * Provides type-safe factory functions to get the correct
 * initializer for a given provider and version.
 */

import type { ProviderInitializer } from './types.js';
import { Authentik2024_8Initializer } from './authentik/v2024-8.js';
import { Authentik2024_12Initializer } from './authentik/v2024-12.js';
import { Authentik2025_6Initializer } from './authentik/v2025-6.js';

export type ProviderType = 'authentik' | 'keycloak';
export type AuthentikVersion = '2024.8' | '2024.12' | '2025.6';
export type KeycloakVersion = '24' | '25' | '26';

/**
 * Normalize Authentik version string to canonical format (e.g., "2024.8")
 * Accepts formats: "v2024-8", "2024-8", "v2024.8", "2024.8"
 */
function normalizeAuthentikVersion(version: string): AuthentikVersion {
  // Remove leading 'v' if present
  const stripped = version.replace(/^v/, '');
  // Replace hyphen with dot
  const normalized = stripped.replace('-', '.');
  return normalized as AuthentikVersion;
}

/**
 * Create an Authentik initializer for a specific version
 */
export function createAuthentikInitializer(
  version: string
): ProviderInitializer {
  const normalizedVersion = normalizeAuthentikVersion(version);
  switch (normalizedVersion) {
    case '2024.8':
      return new Authentik2024_8Initializer();
    case '2024.12':
      return new Authentik2024_12Initializer();
    case '2025.6':
      return new Authentik2025_6Initializer();
    default:
      throw new Error(`Unknown Authentik version: ${version} (normalized: ${normalizedVersion})`);
  }
}

/**
 * Create a Keycloak initializer for a specific version
 * Returns null because Keycloak uses declarative realm JSON import
 */
export function createKeycloakInitializer(
  version: KeycloakVersion
): ProviderInitializer | null {
  // Keycloak uses declarative realm JSON, no programmatic init needed
  console.log(`Keycloak ${version} uses declarative realm JSON import, no initialization needed`);
  return null;
}

/**
 * Create a provider initializer
 */
export function createProviderInitializer(
  provider: 'authentik',
  version: AuthentikVersion
): ProviderInitializer;
export function createProviderInitializer(
  provider: 'keycloak',
  version: KeycloakVersion
): ProviderInitializer | null;
export function createProviderInitializer(
  provider: ProviderType,
  version: string
): ProviderInitializer | null {
  if (provider === 'authentik') {
    return createAuthentikInitializer(version as AuthentikVersion);
  }

  if (provider === 'keycloak') {
    return createKeycloakInitializer(version as KeycloakVersion);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Check if a provider version requires programmatic initialization
 */
export function requiresInit(provider: ProviderType): boolean {
  // Keycloak uses realm JSON import, Authentik requires API setup
  return provider === 'authentik';
}
