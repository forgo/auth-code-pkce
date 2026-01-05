import { describe, it, expect } from 'vitest';
import {
  bytesToBase64,
  base64ToBytes,
  bytesToBase64Url,
  base64encode,
  base64decode,
} from './base64.js';

describe('crypto/base64', () => {
  describe('bytesToBase64', () => {
    it('should encode bytes to standard base64', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      expect(bytesToBase64(bytes)).toBe('SGVsbG8=');
    });

    it('should handle empty array', () => {
      expect(bytesToBase64(new Uint8Array([]))).toBe('');
    });

    it('should add proper padding for 1 byte', () => {
      // 1 byte -> 2 padding chars
      expect(bytesToBase64(new Uint8Array([65]))).toBe('QQ==');
    });

    it('should add proper padding for 2 bytes', () => {
      // 2 bytes -> 1 padding char
      expect(bytesToBase64(new Uint8Array([65, 66]))).toBe('QUI=');
    });

    it('should not add padding for 3 bytes', () => {
      // 3 bytes -> no padding
      expect(bytesToBase64(new Uint8Array([65, 66, 67]))).toBe('QUJD');
    });

    it('should handle large arrays', () => {
      const bytes = new Uint8Array(1000).fill(255);
      const result = bytesToBase64(bytes);
      expect(result.length).toBeGreaterThan(0);
      // 1000 % 3 == 1, so should have 2 padding chars
      expect(result.endsWith('==')).toBe(true);
    });

    it('should encode all byte values correctly', () => {
      const bytes = new Uint8Array([0, 127, 255]);
      const result = bytesToBase64(bytes);
      expect(result).toBe('AH//');
    });
  });

  describe('base64ToBytes', () => {
    it('should decode standard base64 to bytes', () => {
      const result = base64ToBytes('SGVsbG8=');
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should handle empty string', () => {
      const result = base64ToBytes('');
      expect(result.length).toBe(0);
    });

    it('should decode strings with 2 padding chars', () => {
      const result = base64ToBytes('QQ==');
      expect(Array.from(result)).toEqual([65]);
    });

    it('should decode strings with 1 padding char', () => {
      const result = base64ToBytes('QUI=');
      expect(Array.from(result)).toEqual([65, 66]);
    });

    it('should decode strings without padding', () => {
      const result = base64ToBytes('QUJD');
      expect(Array.from(result)).toEqual([65, 66, 67]);
    });

    it('should throw on invalid base64 length', () => {
      expect(() => base64ToBytes('ABC')).toThrow('Unable to parse base64 string');
    });

    it('should throw on invalid base64 characters', () => {
      expect(() => base64ToBytes('AB!D')).toThrow('Unable to parse base64 string');
    });

    it('should throw on padding in wrong position', () => {
      expect(() => base64ToBytes('A=BC')).toThrow('Unable to parse base64 string');
    });

    it('should roundtrip encode/decode', () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
      const encoded = bytesToBase64(original);
      const decoded = base64ToBytes(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });

  describe('bytesToBase64Url', () => {
    it('should produce URL-safe base64 without padding', () => {
      const bytes = new Uint8Array([255, 254, 253]);
      const result = bytesToBase64Url(bytes);
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should replace + with -', () => {
      // Byte value that produces + in standard base64: 62 in 6-bit = 62
      // We need bytes that result in index 62 (+) in the base64 alphabet
      const bytes = new Uint8Array([251, 239]); // This will have + in standard base64
      const standard = bytesToBase64(bytes);
      const urlSafe = bytesToBase64Url(bytes);

      if (standard.includes('+')) {
        expect(urlSafe).toContain('-');
        expect(urlSafe).not.toContain('+');
      }
    });

    it('should replace / with _', () => {
      // Byte value that produces / in standard base64: 63 in 6-bit = 63
      const bytes = new Uint8Array([255, 255]); // This will have / in standard base64
      const standard = bytesToBase64(bytes);
      const urlSafe = bytesToBase64Url(bytes);

      if (standard.includes('/')) {
        expect(urlSafe).toContain('_');
        expect(urlSafe).not.toContain('/');
      }
    });

    it('should remove padding', () => {
      const bytes = new Uint8Array([65]); // 1 byte = 2 padding chars normally
      const standard = bytesToBase64(bytes);
      const urlSafe = bytesToBase64Url(bytes);

      expect(standard).toBe('QQ==');
      expect(urlSafe).toBe('QQ');
    });

    it('should handle empty array', () => {
      expect(bytesToBase64Url(new Uint8Array([]))).toBe('');
    });

    it('should produce valid URL component', () => {
      const bytes = new Uint8Array(32).fill(255);
      const result = bytesToBase64Url(bytes);
      // Should be valid in URL without encoding
      expect(encodeURIComponent(result)).toBe(result);
    });
  });

  describe('base64encode', () => {
    it('should encode string to base64', () => {
      expect(base64encode('Hello')).toBe('SGVsbG8=');
    });

    it('should handle empty string', () => {
      expect(base64encode('')).toBe('');
    });

    it('should handle unicode characters', () => {
      const result = base64encode('Hello, World!');
      expect(result).toBeTruthy();
      expect(base64decode(result)).toBe('Hello, World!');
    });

    it('should handle special characters', () => {
      const result = base64encode('!@#$%^&*()');
      expect(result).toBeTruthy();
      expect(base64decode(result)).toBe('!@#$%^&*()');
    });

    it('should handle multi-byte unicode', () => {
      const result = base64encode('\u{1F600}'); // Emoji
      expect(result).toBeTruthy();
      expect(base64decode(result)).toBe('\u{1F600}');
    });
  });

  describe('base64decode', () => {
    it('should decode base64 string', () => {
      expect(base64decode('SGVsbG8=')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(base64decode('')).toBe('');
    });

    it('should roundtrip with base64encode', () => {
      const original = 'Hello, World! 123';
      const encoded = base64encode(original);
      const decoded = base64decode(encoded);
      expect(decoded).toBe(original);
    });

    it('should handle unicode in roundtrip', () => {
      const original = 'Caf\u00e9';
      const encoded = base64encode(original);
      const decoded = base64decode(encoded);
      expect(decoded).toBe(original);
    });
  });
});
