import { vi } from 'vitest';

/**
 * Create a mock Location object
 */
export function createMockLocation(overrides: Partial<Location> = {}): Location {
  return {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
    ancestorOrigins: {
      length: 0,
      item: () => null,
      contains: () => false,
      [Symbol.iterator]: function* () {},
    },
    ...overrides,
  } as Location;
}

/**
 * Create a mock in-memory storage
 */
export function createMockStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

/**
 * Set window.location to a mock with the given URL
 */
export function mockWindowLocation(url: string): void {
  const parsedUrl = new URL(url);
  Object.defineProperty(window, 'location', {
    value: createMockLocation({
      href: parsedUrl.href,
      origin: parsedUrl.origin,
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      hash: parsedUrl.hash,
    }),
    writable: true,
    configurable: true,
  });
}

/**
 * Create a mock History object
 */
export function createMockHistory(): History {
  return {
    replaceState: vi.fn(),
    pushState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    length: 1,
    state: null,
    scrollRestoration: 'auto',
  };
}
