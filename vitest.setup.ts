import { vi, beforeEach, afterEach } from 'vitest';

// Default mock location
const createMockLocation = () => ({
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
});

// Default mock history
const createMockHistory = () => ({
  replaceState: vi.fn(),
  pushState: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  length: 1,
  state: null,
  scrollRestoration: 'auto' as ScrollRestoration,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Reset location
  Object.defineProperty(window, 'location', {
    value: createMockLocation(),
    writable: true,
    configurable: true,
  });

  // Reset history
  Object.defineProperty(window, 'history', {
    value: createMockHistory(),
    writable: true,
    configurable: true,
  });

  // Clear storage
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
