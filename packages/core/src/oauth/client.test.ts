import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOAuthClient } from './client.js';
import { createMemoryStorageConfig } from '../storage/index.js';
import { storeTokens } from './token.js';
import { STORAGE_KEYS } from '../types/storage.js';
import type { ProviderConfig } from '../types/provider.js';
import type { TokenState } from '../types/oauth.js';
import {
  createMockHttpClient,
  createMockTokenResponse,
  createMockJwt,
} from '../__mocks__/http.js';
import { mockWindowLocation } from '../__mocks__/browser.js';

describe('oauth/client', () => {
  const mockProvider: ProviderConfig = {
    issuer: 'https://auth.example.com',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['openid', 'profile', 'email'],
    endpoints: {
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      logoutEndpoint: 'https://auth.example.com/logout',
    },
  };

  beforeEach(() => {
    mockWindowLocation('http://localhost:3000');
  });

  describe('createOAuthClient', () => {
    it('should create client with initial loading state', () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });

      const state = client.getState();
      expect(state.isLoading).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.jwt).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should set isLoading to false when no tokens exist', async () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });

      await client.initialize();

      const state = client.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should load user from existing valid tokens', async () => {
      const storage = createMemoryStorageConfig();
      const idToken = createMockJwt({ sub: 'user-123', email: 'test@example.com' });
      storeTokens(
        {
          accessToken: 'valid-access-token',
          refreshToken: 'refresh-token',
          idToken,
          expiresAt: Date.now() + 3600000, // 1 hour from now
          scope: 'openid profile email',
        },
        storage
      );

      const client = createOAuthClient({ provider: mockProvider, storage });
      await client.initialize();

      const state = client.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.jwt?.sub).toBe('user-123');
    });

    it('should call getUser callback when provided', async () => {
      const storage = createMemoryStorageConfig();
      const idToken = createMockJwt({ sub: 'user-123' });
      storeTokens(
        {
          accessToken: 'access-token',
          refreshToken: null,
          idToken,
          expiresAt: Date.now() + 3600000,
          scope: null,
        },
        storage
      );

      const getUser = vi.fn().mockResolvedValue({ id: '123', name: 'Test User' });

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        getUser,
      });
      await client.initialize();

      expect(getUser).toHaveBeenCalledWith({
        accessToken: 'access-token',
        jwt: expect.objectContaining({ sub: 'user-123' }),
        httpClient: expect.any(Object),
      });

      const state = client.getState();
      expect(state.user).toEqual({ id: '123', name: 'Test User' });
    });

    it('should handle callback URL and exchange code for tokens', async () => {
      mockWindowLocation(
        'http://localhost:3000/callback?code=auth-code&state=test-state'
      );

      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });
      await client.initialize();

      const state = client.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should try to refresh expired tokens', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'expired-token',
          refreshToken: 'refresh-token',
          idToken: null,
          expiresAt: Date.now() - 1000, // Already expired
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });
      await client.initialize();

      const state = client.getState();
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear tokens if refresh fails', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'expired-token',
          refreshToken: 'invalid-refresh',
          idToken: null,
          expiresAt: Date.now() - 1000,
          scope: null,
        },
        storage
      );

      const httpClient = {
        request: vi.fn().mockResolvedValue({ status: 400, data: { error: 'invalid_grant' } }),
      };

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });
      await client.initialize();

      const state = client.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(storage.tokenStorage.get(STORAGE_KEYS.TOKENS)).toBeNull();
    });
  });

  describe('authorize', () => {
    it('should redirect to authorization URL', () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });

      client.authorize();

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com/authorize')
      );
    });

    it('should pass options to authorize', () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });

      client.authorize({ prompt: 'login' });

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('prompt=login')
      );
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers on state change', async () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });
      const listener = vi.fn();

      client.subscribe(listener);
      await client.initialize();

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });
      const listener = vi.fn();

      const unsubscribe = client.subscribe(listener);
      unsubscribe();
      await client.initialize();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', async () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      client.subscribe(listener1);
      client.subscribe(listener2);
      await client.initialize();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('onAuthStateChange callback', () => {
    it('should be called on state changes', async () => {
      const storage = createMemoryStorageConfig();
      const onAuthStateChange = vi.fn();

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        onAuthStateChange,
      });

      await client.initialize();

      expect(onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('getAccessToken', () => {
    it('should return null when not authenticated', async () => {
      const storage = createMemoryStorageConfig();
      const client = createOAuthClient({ provider: mockProvider, storage });

      const token = await client.getAccessToken();
      expect(token).toBeNull();
    });

    it('should return access token when valid', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'valid-token',
          refreshToken: null,
          idToken: null,
          expiresAt: Date.now() + 3600000,
          scope: null,
        },
        storage
      );

      const client = createOAuthClient({ provider: mockProvider, storage });
      const token = await client.getAccessToken();

      expect(token).toBe('valid-token');
    });

    it('should refresh token when near expiration', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          idToken: null,
          expiresAt: Date.now() + 30000, // 30 seconds (within 60s buffer)
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([
          [
            'https://auth.example.com/token',
            createMockTokenResponse({ access_token: 'new-token' }),
          ],
        ])
      );

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });
      const token = await client.getAccessToken();

      expect(token).toBe('new-token');
    });

    it('should return null if refresh fails', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'old-token',
          refreshToken: 'invalid-refresh',
          idToken: null,
          expiresAt: Date.now() + 30000,
          scope: null,
        },
        storage
      );

      const httpClient = {
        request: vi.fn().mockResolvedValue({ status: 400, data: { error: 'invalid_grant' } }),
      };

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });
      const token = await client.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return true on successful refresh', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          idToken: null,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });

      const result = await client.refreshToken();
      expect(result).toBe(true);
    });

    it('should return false when no refresh token', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'token',
          refreshToken: null,
          idToken: null,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const client = createOAuthClient({ provider: mockProvider, storage });
      const result = await client.refreshToken();
      expect(result).toBe(false);
    });

    it('should call onTokenRefresh callback on success', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          idToken: null,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const onTokenRefresh = vi.fn();
      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
        onTokenRefresh,
      });

      await client.refreshToken();

      expect(onTokenRefresh).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'mock-access-token' })
      );
    });
  });

  describe('logout', () => {
    it('should clear tokens and update state', async () => {
      const storage = createMemoryStorageConfig();
      const idToken = createMockJwt({ sub: 'user-123' });
      storeTokens(
        {
          accessToken: 'token',
          refreshToken: null,
          idToken,
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const client = createOAuthClient({ provider: mockProvider, storage });
      await client.initialize();

      client.logout({ localOnly: true });

      const state = client.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.jwt).toBeNull();
      expect(state.user).toBeNull();
      expect(storage.tokenStorage.get(STORAGE_KEYS.TOKENS)).toBeNull();
    });

    it('should redirect to provider logout when not localOnly', async () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'token',
          refreshToken: null,
          idToken: 'id-token',
          expiresAt: null,
          scope: null,
        },
        storage
      );

      const client = createOAuthClient({ provider: mockProvider, storage });

      client.logout();

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com/logout')
      );
    });
  });

  describe('handleCallback', () => {
    it('should handle callback error', async () => {
      mockWindowLocation(
        'http://localhost:3000/callback?error=access_denied&error_description=User%20denied'
      );

      const storage = createMemoryStorageConfig();
      const onError = vi.fn();

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        onError,
      });
      await client.handleCallback();

      const state = client.getState();
      expect(state.error).not.toBeNull();
      expect(state.error?.code).toBe('callback_error');
      expect(onError).toHaveBeenCalled();
    });

    it('should update history after successful callback', async () => {
      mockWindowLocation(
        'http://localhost:3000/callback?code=auth-code&state=test-state'
      );

      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'test-state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'test-verifier');
      storage.flowStorage.set(STORAGE_KEYS.PRE_AUTH_PATH, '/dashboard');

      const httpClient = createMockHttpClient(
        new Map([['https://auth.example.com/token', createMockTokenResponse()]])
      );

      const client = createOAuthClient({
        provider: mockProvider,
        storage,
        httpClient,
      });
      await client.handleCallback();

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'http://localhost:3000/dashboard'
      );
    });
  });
});
