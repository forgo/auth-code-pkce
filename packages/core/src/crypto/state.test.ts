import { describe, it, expect } from 'vitest';
import { generateState, validateState } from './state.js';

describe('crypto/state', () => {
  describe('generateState', () => {
    it('should generate URL-safe base64 string', () => {
      const state = generateState();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate state with correct length (43 chars for 32 bytes)', () => {
      const state = generateState();
      // 32 bytes in base64url = 43 characters
      expect(state.length).toBe(43);
    });

    it('should not contain padding characters', () => {
      const state = generateState();
      expect(state).not.toContain('=');
    });

    it('should generate unique states on each call', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });

    it('should respect custom length parameter', () => {
      const state16 = generateState(16);
      const state32 = generateState(32);
      // 16 bytes = ~22 chars, 32 bytes = 43 chars in base64url
      expect(state16.length).toBeLessThan(state32.length);
    });

    it('should generate high entropy values', () => {
      const states = new Set<string>();
      for (let i = 0; i < 100; i++) {
        states.add(generateState());
      }
      expect(states.size).toBe(100);
    });
  });

  describe('validateState', () => {
    it('should return true for matching states', () => {
      expect(validateState('abc123', 'abc123')).toBe(true);
    });

    it('should return false for non-matching states', () => {
      expect(validateState('abc123', 'xyz789')).toBe(false);
    });

    it('should return false when received state is null', () => {
      expect(validateState(null, 'stored-state')).toBe(false);
    });

    it('should return false when stored state is null', () => {
      expect(validateState('received-state', null)).toBe(false);
    });

    it('should return false when both states are null', () => {
      expect(validateState(null, null)).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(validateState('short', 'longer-string')).toBe(false);
    });

    it('should return false for empty strings when one is non-empty', () => {
      expect(validateState('', 'non-empty')).toBe(false);
      expect(validateState('non-empty', '')).toBe(false);
    });

    it('should return false for two empty strings', () => {
      // Empty strings are falsy so validateState returns false
      expect(validateState('', '')).toBe(false);
    });

    it('should handle strings with special characters', () => {
      const state = 'abc-_123XYZ';
      expect(validateState(state, state)).toBe(true);
      expect(validateState(state, 'abc-_123XYz')).toBe(false);
    });

    it('should use constant-time comparison (same behavior regardless of mismatch position)', () => {
      // These tests verify correct behavior, not actual timing
      // (Actual timing attacks would require statistical analysis)
      const state = 'a'.repeat(100);

      // Mismatch at beginning
      const stateDiffStart = 'b' + 'a'.repeat(99);
      expect(validateState(state, stateDiffStart)).toBe(false);

      // Mismatch at end
      const stateDiffEnd = 'a'.repeat(99) + 'b';
      expect(validateState(state, stateDiffEnd)).toBe(false);

      // Mismatch in middle
      const stateDiffMiddle = 'a'.repeat(50) + 'b' + 'a'.repeat(49);
      expect(validateState(state, stateDiffMiddle)).toBe(false);
    });

    it('should correctly validate generated states', () => {
      const generated = generateState();
      expect(validateState(generated, generated)).toBe(true);
      expect(validateState(generated, generateState())).toBe(false);
    });
  });
});
