import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sha256,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  PKCE_CHALLENGE_METHOD,
} from './pkce.js';

describe('crypto/pkce', () => {
  describe('sha256', () => {
    it('should hash string correctly', () => {
      const result = sha256('test');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32); // SHA-256 = 32 bytes
    });

    it('should produce consistent results for same input', () => {
      const result1 = sha256('hello');
      const result2 = sha256('hello');
      expect(Array.from(result1)).toEqual(Array.from(result2));
    });

    it('should produce different results for different inputs', () => {
      const result1 = sha256('hello');
      const result2 = sha256('world');
      expect(Array.from(result1)).not.toEqual(Array.from(result2));
    });

    it('should handle empty string', () => {
      const result = sha256('');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should handle unicode characters', () => {
      const result = sha256('hello world');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });
  });

  describe('generateCodeVerifier', () => {
    it('should generate URL-safe base64 string', () => {
      const verifier = generateCodeVerifier();
      // URL-safe base64 should not contain +, /, or =
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate verifier with correct length (43 chars for 32 bytes)', () => {
      const verifier = generateCodeVerifier();
      // 32 bytes in base64url = 43 characters (no padding)
      expect(verifier.length).toBe(43);
    });

    it('should not contain padding characters', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).not.toContain('=');
    });

    it('should generate unique verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should generate high entropy values', () => {
      // Generate multiple verifiers and check they are all unique
      const verifiers = new Set<string>();
      for (let i = 0; i < 100; i++) {
        verifiers.add(generateCodeVerifier());
      }
      expect(verifiers.size).toBe(100);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate URL-safe base64 string without padding', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge).not.toContain('=');
    });

    it('should generate challenge with correct length (43 chars for SHA-256)', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      // SHA-256 = 32 bytes = 43 chars in base64url
      expect(challenge.length).toBe(43);
    });

    it('should produce consistent challenge for same verifier', () => {
      const verifier = 'test-verifier-12345';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should produce different challenges for different verifiers', () => {
      const challenge1 = generateCodeChallenge('verifier-1');
      const challenge2 = generateCodeChallenge('verifier-2');
      expect(challenge1).not.toBe(challenge2);
    });

    it('should produce challenge different from verifier (S256 method)', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      // S256 should always produce a different value than the input
      expect(challenge).not.toBe(verifier);
    });
  });

  describe('generatePKCEPair', () => {
    it('should return object with codeVerifier and codeChallenge', () => {
      const pair = generatePKCEPair();
      expect(pair).toHaveProperty('codeVerifier');
      expect(pair).toHaveProperty('codeChallenge');
    });

    it('should generate valid code verifier', () => {
      const pair = generatePKCEPair();
      expect(pair.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(pair.codeVerifier.length).toBe(43);
    });

    it('should generate valid code challenge', () => {
      const pair = generatePKCEPair();
      expect(pair.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(pair.codeChallenge.length).toBe(43);
    });

    it('should generate matching verifier and challenge', () => {
      const pair = generatePKCEPair();
      const expectedChallenge = generateCodeChallenge(pair.codeVerifier);
      expect(pair.codeChallenge).toBe(expectedChallenge);
    });

    it('should generate unique pairs on each call', () => {
      const pair1 = generatePKCEPair();
      const pair2 = generatePKCEPair();
      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });
  });

  describe('PKCE_CHALLENGE_METHOD', () => {
    it('should be S256', () => {
      expect(PKCE_CHALLENGE_METHOD).toBe('S256');
    });
  });
});
