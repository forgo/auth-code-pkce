import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAuthorizationUrl, authorize, getAndClearPreAuthPath } from './authorize.js';
import { createMemoryStorageConfig } from '../storage/index.js';
import { STORAGE_KEYS } from '../types/storage.js';
import type { ProviderConfig } from '../types/provider.js';
import { mockWindowLocation } from '../__mocks__/browser.js';

describe('oauth/authorize', () => {
  const mockProvider: ProviderConfig = {
    issuer: 'https://auth.example.com',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['openid', 'profile', 'email'],
    endpoints: {
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
    },
  };

  beforeEach(() => {
    mockWindowLocation('http://localhost:3000/dashboard?tab=settings');
  });

  describe('buildAuthorizationUrl', () => {
    it('should build correct authorization URL with required params', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage);

      const parsedUrl = new URL(url);
      expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://auth.example.com/authorize');
      expect(parsedUrl.searchParams.get('client_id')).toBe('test-client-id');
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('scope')).toBe('openid profile email');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(parsedUrl.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('should include code_challenge parameter', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage);

      const parsedUrl = new URL(url);
      const codeChallenge = parsedUrl.searchParams.get('code_challenge');
      expect(codeChallenge).toBeTruthy();
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(codeChallenge!.length).toBe(43);
    });

    it('should include state parameter', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage);

      const parsedUrl = new URL(url);
      const state = parsedUrl.searchParams.get('state');
      expect(state).toBeTruthy();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should store code verifier in flow storage', () => {
      const storage = createMemoryStorageConfig();
      buildAuthorizationUrl(mockProvider, storage);

      const codeVerifier = storage.flowStorage.get(STORAGE_KEYS.CODE_VERIFIER);
      expect(codeVerifier).toBeTruthy();
      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should store state in flow storage', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage);

      const parsedUrl = new URL(url);
      const stateInUrl = parsedUrl.searchParams.get('state');
      const storedState = storage.flowStorage.get(STORAGE_KEYS.STATE);

      expect(storedState).toBe(stateInUrl);
    });

    it('should store redirect URI in flow storage', () => {
      const storage = createMemoryStorageConfig();
      buildAuthorizationUrl(mockProvider, storage);

      expect(storage.flowStorage.get(STORAGE_KEYS.REDIRECT_URI)).toBe(
        'http://localhost:3000/callback'
      );
    });

    it('should preserve current path when preservePath option is true', () => {
      const storage = createMemoryStorageConfig();
      buildAuthorizationUrl(mockProvider, storage, { preservePath: true });

      expect(storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH)).toBe('/dashboard?tab=settings');
    });

    it('should not store preAuthPath when preservePath is false', () => {
      const storage = createMemoryStorageConfig();
      buildAuthorizationUrl(mockProvider, storage, { preservePath: false });

      expect(storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH)).toBeNull();
    });

    it('should not store preAuthPath by default', () => {
      const storage = createMemoryStorageConfig();
      buildAuthorizationUrl(mockProvider, storage);

      expect(storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH)).toBeNull();
    });

    it('should include prompt parameter when specified', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage, { prompt: 'login' });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('prompt')).toBe('login');
    });

    it('should include consent prompt', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage, { prompt: 'consent' });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('prompt')).toBe('consent');
    });

    it('should include none prompt', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage, { prompt: 'none' });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('prompt')).toBe('none');
    });

    it('should include additional params', () => {
      const storage = createMemoryStorageConfig();
      const url = buildAuthorizationUrl(mockProvider, storage, {
        additionalParams: { acr_values: 'mfa', login_hint: 'user@example.com' },
      });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('acr_values')).toBe('mfa');
      expect(parsedUrl.searchParams.get('login_hint')).toBe('user@example.com');
    });

    it('should include provider additionalAuthParams', () => {
      const storage = createMemoryStorageConfig();
      const providerWithParams: ProviderConfig = {
        ...mockProvider,
        additionalAuthParams: { audience: 'https://api.example.com' },
      };
      const url = buildAuthorizationUrl(providerWithParams, storage);

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('audience')).toBe('https://api.example.com');
    });

    it('should merge provider and option additionalParams (options take precedence)', () => {
      const storage = createMemoryStorageConfig();
      const providerWithParams: ProviderConfig = {
        ...mockProvider,
        additionalAuthParams: { param1: 'provider-value', param2: 'provider-only' },
      };
      const url = buildAuthorizationUrl(providerWithParams, storage, {
        additionalParams: { param1: 'option-value', param3: 'option-only' },
      });

      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('param1')).toBe('option-value');
      expect(parsedUrl.searchParams.get('param2')).toBe('provider-only');
      expect(parsedUrl.searchParams.get('param3')).toBe('option-only');
    });

    it('should generate unique PKCE values on each call', () => {
      const storage = createMemoryStorageConfig();

      const url1 = buildAuthorizationUrl(mockProvider, storage);
      const codeChallenge1 = new URL(url1).searchParams.get('code_challenge');
      const state1 = new URL(url1).searchParams.get('state');

      const url2 = buildAuthorizationUrl(mockProvider, storage);
      const codeChallenge2 = new URL(url2).searchParams.get('code_challenge');
      const state2 = new URL(url2).searchParams.get('state');

      expect(codeChallenge1).not.toBe(codeChallenge2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('authorize', () => {
    it('should redirect to authorization URL', () => {
      const storage = createMemoryStorageConfig();
      authorize(mockProvider, storage);

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com/authorize')
      );
    });

    it('should include required parameters in redirect URL', () => {
      const storage = createMemoryStorageConfig();
      authorize(mockProvider, storage);

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('client_id=test-client-id')
      );
      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('response_type=code')
      );
      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('code_challenge_method=S256')
      );
    });

    it('should pass options to buildAuthorizationUrl', () => {
      const storage = createMemoryStorageConfig();
      authorize(mockProvider, storage, { prompt: 'login', preservePath: true });

      expect(window.location.replace).toHaveBeenCalledWith(expect.stringContaining('prompt=login'));
      expect(storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH)).toBe('/dashboard?tab=settings');
    });
  });

  describe('getAndClearPreAuthPath', () => {
    it('should return stored path and clear it', () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, '/dashboard');

      const path = getAndClearPreAuthPath(storage);
      expect(path).toBe('/dashboard');
      expect(storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH)).toBeNull();
    });

    it('should return "/" when no path stored', () => {
      const storage = createMemoryStorageConfig();
      expect(getAndClearPreAuthPath(storage)).toBe('/');
    });

    it('should handle complex paths with query and hash', () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, '/dashboard?tab=settings#section');

      const path = getAndClearPreAuthPath(storage);
      expect(path).toBe('/dashboard?tab=settings#section');
    });

    it('should be idempotent (return "/" on second call)', () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, '/dashboard');

      const path1 = getAndClearPreAuthPath(storage);
      const path2 = getAndClearPreAuthPath(storage);

      expect(path1).toBe('/dashboard');
      expect(path2).toBe('/');
    });
  });
});
