/**
 * OAuth state parameter utilities
 *
 * The state parameter is used to prevent CSRF attacks by ensuring
 * the authorization response is for a request initiated by this client.
 *
 * IMPORTANT: The previous implementation used a hardcoded state value "_state"
 * which is a security vulnerability. This module properly generates random state
 * values and validates them on callback.
 */

import { random } from "nanoid";
import { bytesToBase64Url } from "./base64.js";

/**
 * Generate cryptographically random state parameter
 *
 * @param length Number of random bytes (default: 32 = 256 bits)
 * @returns URL-safe base64 encoded random string
 */
export function generateState(length: number = 32): string {
  return bytesToBase64Url(random(length));
}

/**
 * Validate that received state matches stored state
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param receivedState State received from authorization callback
 * @param storedState State stored before authorization redirect
 * @returns true if states match, false otherwise
 */
export function validateState(
  receivedState: string | null,
  storedState: string | null
): boolean {
  if (!receivedState || !storedState) {
    return false;
  }

  if (receivedState.length !== storedState.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < receivedState.length; i++) {
    result |= receivedState.charCodeAt(i) ^ storedState.charCodeAt(i);
  }

  return result === 0;
}
