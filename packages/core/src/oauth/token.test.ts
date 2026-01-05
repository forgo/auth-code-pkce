import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TokenRefreshCoordinator,
  parseTokenResponse,
  storeTokens,
  getStoredTokens,
  clearTokens,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './token.js';
import { createMemoryStorageConfig } from '../storage/index.js';
import { STORAGE_KEYS } from '../types/storage.js';
import type { TokenResponse, TokenState } from '../types/oauth.js';
import type { ProviderConfig } from '../types/provider.js';
import {
  createMockHttpClient,
  createMockTokenResponse,
  createMockTokenErrorResponse,
  createMockJwt,
} from '../__mocks__/http.js';
import { mockWindowLocation } from '../__mocks__/browser.js';

describe('oauth/token', () => {
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

  describe('TokenRefreshCoordinator', () => {
    it('should only execute one refresh at a time', async () => {
      const coordinator = new TokenRefreshCoordinator();
      const refreshFn = vi.fn().mockResolvedValue({ accessToken: 'new-token' } as TokenState);

      // Start multiple refreshes simultaneously
      const promise1 = coordinator.refresh(refreshFn);
      const promise2 = coordinator.refresh(refreshFn);
      const promise3 = coordinator.refresh(refreshFn);

      await Promise.all([promise1, promise2, promise3]);

      // Should only call refreshFn once
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });

    it('should return same result to all concurrent callers', async () => {
      const coordinator = new TokenRefreshCoordinator();
      const expectedResult = { accessToken: 'new-token' } as TokenState;
      const refreshFn = vi.fn().mockResolvedValue(expectedResult);

      const results = await Promise.all([
        coordinator.refresh(refreshFn),
        coordinator.refresh(refreshFn),
        coordinator.refresh(refreshFn),
      ]);

      expect(results[0]).toBe(expectedResult);
      expect(results[1]).toBe(expectedResult);
      expect(results[2]).toBe(expectedResult);
    });

    it('should report isRefreshing correctly during refresh', async () => {
      const coordinator = new TokenRefreshCoordinator();
      let resolveRefresh: (value: TokenState | null) => void;
      const refreshPromise = new Promise<TokenState | null>((resolve) => {
        resolveRefresh = resolve;
      });
      const refreshFn = vi.fn().mockReturnValue(refreshPromise);

      expect(coordinator.isRefreshing()).toBe(false);

      const resultPromise = coordinator.refresh(refreshFn);
      expect(coordinator.isRefreshing()).toBe(true);

      resolveRefresh!({ accessToken: 'token' } as TokenState);
      await resultPromise;

      expect(coordinator.isRefreshing()).toBe(false);
    });

    it('should allow new refresh after previous completes', async () => {
      const coordinator = new TokenRefreshCoordinator();
      const refreshFn = vi.fn().mockResolvedValue({ accessToken: 'token' } as TokenState);

      await coordinator.refresh(refreshFn);
      await coordinator.refresh(refreshFn);

      expect(refreshFn).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh rejection', async () => {
      const coordinator = new TokenRefreshCoordinator();
      const error = new Error('Refresh failed');
      const refreshFn = vi.fn().mockRejectedValue(error);

      await expect(coordinator.refresh(refreshFn)).rejects.toThrow('Refresh failed');
      expect(coordinator.isRefreshing()).toBe(false);
    });

    it('should reset after rejection to allow retry', async () => {
      const coordinator = new TokenRefreshCoordinator();
      const refreshFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({ accessToken: 'success' } as TokenState);

      await expect(coordinator.refresh(refreshFn)).rejects.toThrow('First failure');
      const result = await coordinator.refresh(refreshFn);

      expect(result?.accessToken).toBe('success');
      expect(refreshFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseTokenResponse', () => {
    it('should parse complete token response', () => {
      const response: TokenResponse = {
        access_token: 'access-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-456',
        id_token: 'id-789',
        scope: 'openid profile',
      };

      const result = parseTokenResponse(response);

      expect(result.accessToken).toBe('access-123');
      expect(result.refreshToken).toBe('refresh-456');
      expect(result.idToken).toBe('id-789');
      expect(result.scope).toBe('openid profile');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000 + 100);
    });

    it('should handle missing optional fields', () => {
      const response: TokenResponse = {
        access_token: 'access-123',
        token_type: 'Bearer',
      };

      const result = parseTokenResponse(response);

      expect(result.accessToken).toBe('access-123');
      expect(result.refreshToken).toBeNull();
      expect(result.idToken).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.scope).toBeNull();
    });

    it('should calculate correct expiration timestamp', () => {
      const now = Date.now();
      const response: TokenResponse = {
        access_token: 'access',
        token_type: 'Bearer',
        expires_in: 7200, // 2 hours
      };

      const result = parseTokenResponse(response);

      // Should be approximately 2 hours from now
      expect(result.expiresAt).toBeGreaterThan(now + 7199 * 1000);
      expect(result.expiresAt).toBeLessThanOrEqual(now + 7200 * 1000 + 100);
    });
  });

  describe('storeTokens / getStoredTokens', () => {
    it('should store and retrieve tokens', () => {
      const storage = createMemoryStorageConfig();
      const tokens: TokenState = {
        accessToken: 'access',
        refreshToken: 'refresh',
        idToken: 'id',
        expiresAt: Date.now() + 3600000,
        scope: 'openid',
      };

      storeTokens(tokens, storage);
      const retrieved = getStoredTokens(storage);

      expect(retrieved).toEqual(tokens);
    });

    it('should return null when no tokens stored', () => {
      const storage = createMemoryStorageConfig();
      expect(getStoredTokens(storage)).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const storage = createMemoryStorageConfig();
      storage.tokenStorage.set(STORAGE_KEYS.TOKENS, 'invalid-json');
      expect(getStoredTokens(storage)).toBeNull();
    });

    it('should overwrite existing tokens', () => {
      const storage = createMemoryStorageConfig();
      const tokens1: TokenState = {
        accessToken: 'old',
        refreshToken: null,
        idToken: null,
        expiresAt: null,
        scope: null,
      };
      const tokens2: TokenState = {
        accessToken: 'new',
        refreshToken: 'refresh',
        idToken: null,
        expiresAt: null,
        scope: null,
      };

      storeTokens(tokens1, storage);
      storeTokens(tokens2, storage);
      const retrieved = getStoredTokens(storage);

      expect(retrieved?.accessToken).toBe('new');
      expect(retrieved?.refreshToken).toBe('refresh');
    });
  });

  describe('clearTokens', () => {
    it('should clear both token and flow storage', () => {
      const storage = createMemoryStorageConfig();
      storage.tokenStorage.set(STORAGE_KEYS.TOKENS, '{}');
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');

      clearTokens(storage);

      expect(storage.tokenStorage.get(STORAGE_KEYS.TOKENS)).toBeNull();
      expect(storage.flowStorage.get(STORAGE_KEYS.STATE)).toBeNull();
      expect(storage.flowStorage.get(STORAGE_KEYS.CODE_VERIFIER)).toBeNull();
    });
  });

  describe('exchangeCodeForTokens', () => {
    beforeEach(() => {
      mockWindowLocation('http://localhost:3000/callback?code=auth-code-123&state=test-state');
    });

    it('should exchange code for tokens successfully', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');
      storage.flowStorage.set(STORAGE_KEYS.REDIRECT_URI, 'http://localhost:3000/callback');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('tokens' in result).toBe(true);
      if ('tokens' in result) {
        expect(result.tokens.accessToken).toBe('mock-access-token');
        expect(result.preAuthPath).toBe('/');
      }
    });

    it('should use stored pre-auth path', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');
      storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, '/dashboard/settings');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('tokens' in result).toBe(true);
      if ('tokens' in result) {
        expect(result.preAuthPath).toBe('/dashboard/settings');
      }
    });

    it('should return error for invalid state', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'different-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');

      const httpClient = createMockHttpClient(new Map());

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('invalid_state');
      }
    });

    it('should return error when code verifier is missing', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      // No code verifier set

      const httpClient = createMockHttpClient(new Map());

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('token_exchange_failed');
        expect(result.error.message).toContain('Code verifier not found');
      }
    });

    it('should prevent authorization code replay', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');
      storage.flowStorage.set(STORAGE_KEYS.PREVIOUS_AUTH_CODE, 'auth-code-123');

      const httpClient = createMockHttpClient(new Map());

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('token_exchange_failed');
        expect(result.error.message).toContain('already exchanged');
      }
    });

    it('should handle OAuth error in callback URL', async () => {
      mockWindowLocation(
        'http://localhost:3000/callback?error=access_denied&error_description=User%20denied'
      );

      const storage = createMemoryStorageConfig();
      const httpClient = createMockHttpClient(new Map());

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('callback_error');
      }
    });

    it('should return error for missing code in callback URL', async () => {
      mockWindowLocation('http://localhost:3000/callback?state=test-state');

      const storage = createMemoryStorageConfig();
      const httpClient = createMockHttpClient(new Map());

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('callback_error');
        expect(result.error.message).toContain('No authorization code');
      }
    });

    it('should handle token endpoint error response', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenErrorResponse()]])
      );

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('token_exchange_failed');
      }
    });

    it('should handle network errors', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');

      const httpClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('network_error');
      }
    });

    it('should clear flow state after successful exchange', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');
      storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, '/dashboard');
      storage.flowStorage.set(STORAGE_KEYS.REDIRECT_URI, 'http://localhost:3000/callback');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      await exchangeCodeForTokens(mockProvider, storage, httpClient);

      expect(storage.flowStorage.get(STORAGE_KEYS.STATE)).toBeNull();
      expect(storage.flowStorage.get(STORAGE_KEYS.CODE_VERIFIER)).toBeNull();
      expect(storage.flowStorage.get(STORAGE_KEYS.PRE_AUTH_PATH)).toBeNull();
      expect(storage.flowStorage.get(STORAGE_KEYS.REDIRECT_URI)).toBeNull();
      // Previous auth code should be preserved
      expect(storage.flowStorage.get(STORAGE_KEYS.PREVIOUS_AUTH_CODE)).toBe('auth-code-123');
    });

    it('should store tokens after successful exchange', async () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      await exchangeCodeForTokens(mockProvider, storage, httpClient);

      const storedTokens = getStoredTokens(storage);
      expect(storedTokens?.accessToken).toBe('mock-access-token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'old-access',
          refreshToken: 'refresh-token',
          idToken: null,
          expiresAt: Date.now() - 1000,
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const result = await refreshAccessToken(mockProvider, storage, httpClient);

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe('mock-access-token');
    });

    it('should return null when no refresh token', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: null,
          idToken: null,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(new Map());

      const result = await refreshAccessToken(mockProvider, storage, httpClient);
      expect(result).toBeNull();
    });

    it('should return null when no tokens stored', async () => {
      const storage = createMemoryStorageConfig();
      const httpClient = createMockHttpClient(new Map());

      const result = await refreshAccessToken(mockProvider, storage, httpClient);
      expect(result).toBeNull();
    });

    it('should return null on token endpoint error', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: 'refresh',
          idToken: null,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenErrorResponse()]])
      );

      const result = await refreshAccessToken(mockProvider, storage, httpClient);
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: 'refresh',
          idToken: null,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const httpClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await refreshAccessToken(mockProvider, storage, httpClient);
      expect(result).toBeNull();
    });

    it('should update stored tokens after successful refresh', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'old-access',
          refreshToken: 'refresh-token',
          idToken: null,
          expiresAt: Date.now() - 1000,
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([
          [
            'https://auth.example.com/token',
            createMockTokenResponse({ access_token: 'new-access-token' }),
          ],
        ])
      );

      await refreshAccessToken(mockProvider, storage, httpClient);

      const storedTokens = getStoredTokens(storage);
      expect(storedTokens?.accessToken).toBe('new-access-token');
    });
  });
});
