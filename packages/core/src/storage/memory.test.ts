import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryStorageAdapter } from './memory.js';

describe('storage/memory', () => {
  let storage: ReturnType<typeof createMemoryStorageAdapter>;

  beforeEach(() => {
    storage = createMemoryStorageAdapter();
  });

  it('should store and retrieve values', () => {
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });

  it('should return null for non-existent keys', () => {
    expect(storage.get('non-existent')).toBeNull();
  });

  it('should remove values', () => {
    storage.set('key', 'value');
    storage.remove('key');
    expect(storage.get('key')).toBeNull();
  });

  it('should clear all values', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    storage.clear();
    expect(storage.get('key1')).toBeNull();
    expect(storage.get('key2')).toBeNull();
  });

  it('should overwrite existing values', () => {
    storage.set('key', 'original');
    storage.set('key', 'updated');
    expect(storage.get('key')).toBe('updated');
  });

  it('should be isolated between instances', () => {
    const storage2 = createMemoryStorageAdapter();
    storage.set('key', 'value1');
    storage2.set('key', 'value2');

    expect(storage.get('key')).toBe('value1');
    expect(storage2.get('key')).toBe('value2');
  });

  it('should handle empty string values', () => {
    storage.set('key', '');
    expect(storage.get('key')).toBe('');
  });

  it('should handle special characters in keys', () => {
    storage.set('key::with::colons', 'value');
    expect(storage.get('key::with::colons')).toBe('value');
  });

  it('should handle JSON values', () => {
    const data = { foo: 'bar', num: 123 };
    storage.set('json', JSON.stringify(data));
    expect(JSON.parse(storage.get('json')!)).toEqual(data);
  });
});
