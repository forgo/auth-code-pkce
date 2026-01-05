import { describe, it, expect } from 'vitest';
import { decodeJwt, isTokenExpired } from './jwt.js';
import { createMockJwt } from '../__mocks__/http.js';

describe('utils/jwt', () => {
  describe('decodeJwt', () => {
    it('should decode valid JWT', () => {
      const jwt = createMockJwt({ sub: 'user-123', email: 'test@example.com' });
      const decoded = decodeJwt(jwt);

      expect(decoded?.sub).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should decode standard claims', () => {
      const jwt = createMockJwt({
        iss: 'https://auth.example.com',
        aud: 'client-123',
        sub: 'user-456',
      });

      const decoded = decodeJwt(jwt);
      expect(decoded?.iss).toBe('https://auth.example.com');
      expect(decoded?.aud).toBe('client-123');
      expect(decoded?.sub).toBe('user-456');
    });

    it('should return null for invalid JWT', () => {
      expect(decodeJwt('invalid-token')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(decodeJwt('')).toBeNull();
    });

    it('should return null for malformed JWT', () => {
      expect(decodeJwt('not.a.jwt.at.all')).toBeNull();
    });

    it('should decode JWT with numeric claims', () => {
      const now = Math.floor(Date.now() / 1000);
      const jwt = createMockJwt({
        iat: now,
        exp: now + 3600,
        nbf: now - 60,
      });

      const decoded = decodeJwt(jwt);
      expect(decoded?.iat).toBe(now);
      expect(decoded?.exp).toBe(now + 3600);
      expect(decoded?.nbf).toBe(now - 60);
    });

    it('should decode JWT with array claims', () => {
      const jwt = createMockJwt({
        aud: ['client-1', 'client-2'],
        roles: ['admin', 'user'],
      });

      const decoded = decodeJwt(jwt);
      expect(decoded?.aud).toEqual(['client-1', 'client-2']);
      expect(decoded?.roles).toEqual(['admin', 'user']);
    });

    it('should support generic type parameter', () => {
      interface CustomPayload {
        sub: string;
        email: string;
        customClaim: string;
      }

      const jwt = createMockJwt({
        sub: 'user-123',
        email: 'test@example.com',
        customClaim: 'custom-value',
      });

      const decoded = decodeJwt<CustomPayload>(jwt);
      expect(decoded?.customClaim).toBe('custom-value');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const jwt = createMockJwt({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      expect(isTokenExpired(jwt)).toBe(false);
    });

    it('should return true for expired token', () => {
      const jwt = createMockJwt({
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });

      expect(isTokenExpired(jwt)).toBe(true);
    });

    it('should consider default clock skew of 60 seconds', () => {
      const jwt = createMockJwt({
        exp: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
      });

      // With default 60 second clock skew, should not be expired
      expect(isTokenExpired(jwt)).toBe(false);
    });

    it('should respect custom clock skew', () => {
      const jwt = createMockJwt({
        exp: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
      });

      // With 0 clock skew, should be expired
      expect(isTokenExpired(jwt, 0)).toBe(true);
      // With 60 second skew, should not be expired
      expect(isTokenExpired(jwt, 60)).toBe(false);
    });

    it('should return false when no exp claim', () => {
      const jwt = createMockJwt({ sub: 'user-123' });
      // Our mock always includes exp, so we need to create a custom one
      const payload = { sub: 'user-123' }; // No exp claim
      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should accept decoded payload directly', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should accept expired decoded payload', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) - 3600 };
      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should handle token expiring exactly now', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = { exp: now };
      // With 60 second clock skew, should not be expired (exp < now - 60 is false)
      expect(isTokenExpired(payload, 60)).toBe(false);
      // With 0 clock skew, exp < now is false (equal, not less than)
      expect(isTokenExpired(payload, 0)).toBe(false);
      // Token that expired 1 second ago with 0 skew should be expired
      expect(isTokenExpired({ exp: now - 1 }, 0)).toBe(true);
    });

    it('should handle far future expiration', () => {
      const jwt = createMockJwt({
        exp: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
      });

      expect(isTokenExpired(jwt)).toBe(false);
    });

    it('should handle far past expiration', () => {
      const jwt = createMockJwt({
        exp: Math.floor(Date.now() / 1000) - 86400 * 365, // 1 year ago
      });

      expect(isTokenExpired(jwt)).toBe(true);
    });
  });
});
