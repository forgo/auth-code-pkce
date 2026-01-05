import { vi } from 'vitest';

/**
 * Deterministic "random" bytes for testing
 * 32 bytes of incrementing values for predictable output
 */
export const MOCK_RANDOM_BYTES = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
  0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
  0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
]);

/**
 * Expected code verifier when using MOCK_RANDOM_BYTES
 * This is the base64url encoding of the mock bytes
 */
export const EXPECTED_CODE_VERIFIER = 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA';

/**
 * Expected state when using MOCK_RANDOM_BYTES
 * Same as code verifier since both use 32 bytes
 */
export const EXPECTED_STATE = 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA';

/**
 * Mock the nanoid random function to return deterministic bytes
 * Call this in beforeEach to ensure deterministic PKCE/state generation
 */
export function mockNanoidRandom(): ReturnType<typeof vi.fn> {
  const mockRandom = vi.fn(() => MOCK_RANDOM_BYTES);

  vi.mock('nanoid', () => ({
    random: mockRandom,
  }));

  return mockRandom;
}

/**
 * Create a sequence of different random byte arrays for testing uniqueness
 */
export function createRandomBytesSequence(count: number): Uint8Array[] {
  const results: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(32);
    for (let j = 0; j < 32; j++) {
      bytes[j] = (i * 32 + j) % 256;
    }
    results.push(bytes);
  }
  return results;
}
