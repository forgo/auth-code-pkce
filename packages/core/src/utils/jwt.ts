import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "../types/oauth.js";

/**
 * Decode a JWT token without verification
 *
 * Note: This only decodes the payload, it does not verify the signature.
 * Token verification should be done on the server side.
 *
 * @param token JWT token string
 * @returns Decoded payload or null if decoding fails
 */
export function decodeJwt<T extends JwtPayload = JwtPayload>(
  token: string
): T | null {
  try {
    return jwtDecode<T>(token);
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 *
 * @param token JWT token string or decoded payload
 * @param clockSkewSeconds Allowed clock skew in seconds (default: 60)
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(
  token: string | JwtPayload,
  clockSkewSeconds: number = 60
): boolean {
  const payload = typeof token === "string" ? decodeJwt(token) : token;

  if (!payload?.exp) {
    // No expiration claim, assume not expired
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now - clockSkewSeconds;
}
