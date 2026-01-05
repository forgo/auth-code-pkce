import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalStorageAdapter } from './local.js';

describe('storage/local', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve values with namespace prefix', () => {
    const storage = createLocalStorageAdapter();
    storage.set('key', 'value');

    expect(storage.get('key')).toBe('value');
    expect(localStorage.getItem('@auth-code-pkce::key')).toBe('value');
  });

  it('should return null for non-existent keys', () => {
    const storage = createLocalStorageAdapter();
    expect(storage.get('non-existent')).toBeNull();
  });

  it('should remove values', () => {
    const storage = createLocalStorageAdapter();
    storage.set('key', 'value');
    storage.remove('key');

    expect(storage.get('key')).toBeNull();
    expect(localStorage.getItem('@auth-code-pkce::key')).toBeNull();
  });

  it('should clear only namespaced values', () => {
    const storage = createLocalStorageAdapter();
    storage.set('myKey', 'myValue');
    localStorage.setItem('otherKey', 'otherValue');

    storage.clear();

    expect(storage.get('myKey')).toBeNull();
    expect(localStorage.getItem('otherKey')).toBe('otherValue');
  });

  it('should use custom namespace', () => {
    const storage = createLocalStorageAdapter('custom-ns');
    storage.set('key', 'value');

    expect(localStorage.getItem('custom-ns::key')).toBe('value');
    expect(localStorage.getItem('@auth-code-pkce::key')).toBeNull();
  });

  it('should isolate different namespaces', () => {
    const storage1 = createLocalStorageAdapter('ns1');
    const storage2 = createLocalStorageAdapter('ns2');

    storage1.set('key', 'value1');
    storage2.set('key', 'value2');

    expect(storage1.get('key')).toBe('value1');
    expect(storage2.get('key')).toBe('value2');
  });

  it('should clear only keys with matching namespace', () => {
    const storage1 = createLocalStorageAdapter('ns1');
    const storage2 = createLocalStorageAdapter('ns2');

    storage1.set('key', 'value1');
    storage2.set('key', 'value2');

    storage1.clear();

    expect(storage1.get('key')).toBeNull();
    expect(storage2.get('key')).toBe('value2');
  });

  it('should handle empty string values', () => {
    const storage = createLocalStorageAdapter();
    storage.set('key', '');
    expect(storage.get('key')).toBe('');
  });

  it('should handle JSON values', () => {
    const storage = createLocalStorageAdapter();
    const data = { foo: 'bar', num: 123 };
    storage.set('json', JSON.stringify(data));
    expect(JSON.parse(storage.get('json')!)).toEqual(data);
  });
});
