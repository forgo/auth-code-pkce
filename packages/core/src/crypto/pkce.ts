/**
 * PKCE (Proof Key for Code Exchange) utilities
 *
 * Implements RFC 7636 - Proof Key for Code Exchange by OAuth Public Clients
 * https://tools.ietf.org/html/rfc7636
 */

import { random } from "nanoid";
import { createHash } from "sha256-uint8array";
import { bytesToBase64Url } from "./base64.js";

/**
 * PKCE code verifier and challenge pair
 */
export interface PKCEPair {
  /** The code verifier (random string, stored locally) */
  codeVerifier: string;
  /** The code challenge (SHA-256 hash of verifier, sent to authorization server) */
  codeChallenge: string;
}

/**
 * SHA-256 hash function
 * @param input String to hash
 * @returns Hash as Uint8Array
 */
export function sha256(input: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return createHash().update(data).digest();
}

/**
 * Generate cryptographically random code verifier
 *
 * The verifier is a random string with 256 bits of entropy,
 * encoded as URL-safe base64 (43 characters).
 *
 * @returns URL-safe base64 encoded random string
 */
export function generateCodeVerifier(): string {
  // 32 bytes = 256 bits of entropy
  return bytesToBase64Url(random(32));
}

/**
 * Derive code challenge from code verifier using S256 method
 *
 * @param codeVerifier The code verifier string
 * @returns URL-safe base64 encoded SHA-256 hash
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return bytesToBase64Url(sha256(codeVerifier));
}

/**
 * Generate PKCE code verifier and challenge pair
 *
 * @returns Object containing codeVerifier and codeChallenge
 */
export function generatePKCEPair(): PKCEPair {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

/**
 * The PKCE challenge method used by this library
 * We always use S256 (SHA-256) as it's more secure than 'plain'
 */
export const PKCE_CHALLENGE_METHOD = "S256" as const;
