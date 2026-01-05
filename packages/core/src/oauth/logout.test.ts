import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildLogoutUrl, logout } from './logout.js';
import { createMemoryStorageConfig } from '../storage/index.js';
import { storeTokens } from './token.js';
import { STORAGE_KEYS } from '../types/storage.js';
import type { ProviderConfig } from '../types/provider.js';
import { mockWindowLocation } from '../__mocks__/browser.js';

describe('oauth/logout', () => {
  const mockProviderWithLogout: ProviderConfig = {
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

  const mockProviderWithoutLogout: ProviderConfig = {
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
    mockWindowLocation('http://localhost:3000');
  });

  describe('buildLogoutUrl', () => {
    it('should return null if provider has no logout endpoint', () => {
      const url = buildLogoutUrl(mockProviderWithoutLogout, 'id-token');
      expect(url).toBeNull();
    });

    it('should build logout URL with post_logout_redirect_uri', () => {
      const url = buildLogoutUrl(mockProviderWithLogout, null);

      expect(url).toBeTruthy();
      const parsedUrl = new URL(url!);
      expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://auth.example.com/logout');
      expect(parsedUrl.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000');
    });

    it('should include id_token_hint when idToken is provided', () => {
      const url = buildLogoutUrl(mockProviderWithLogout, 'my-id-token');

      const parsedUrl = new URL(url!);
      expect(parsedUrl.searchParams.get('id_token_hint')).toBe('my-id-token');
    });

    it('should not include id_token_hint when idToken is null', () => {
      const url = buildLogoutUrl(mockProviderWithLogout, null);

      const parsedUrl = new URL(url!);
      expect(parsedUrl.searchParams.has('id_token_hint')).toBe(false);
    });

    it('should use postLogoutRedirectUri from provider if available', () => {
      const providerWithCustomRedirect: ProviderConfig = {
        ...mockProviderWithLogout,
        postLogoutRedirectUri: 'http://localhost:3000/logged-out',
      };

      const url = buildLogoutUrl(providerWithCustomRedirect, null);

      const parsedUrl = new URL(url!);
      expect(parsedUrl.searchParams.get('post_logout_redirect_uri')).toBe(
        'http://localhost:3000/logged-out'
      );
    });
  });

  describe('logout', () => {
    it('should clear tokens from storage', () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: 'refresh',
          idToken: 'id',
          expiresAt: null,
          scope: null,
        },
        storage
      );

      logout(mockProviderWithoutLogout, storage, { localOnly: true });

      expect(storage.tokenStorage.get(STORAGE_KEYS.TOKENS)).toBeNull();
    });

    it('should clear flow state from storage', () => {
      const storage = createMemoryStorageConfig();
      storage.flowStorage.set(STORAGE_KEYS.STATE, 'state');
      storage.flowStorage.set(STORAGE_KEYS.CODE_VERIFIER, 'verifier');

      logout(mockProviderWithoutLogout, storage, { localOnly: true });

      expect(storage.flowStorage.get(STORAGE_KEYS.STATE)).toBeNull();
      expect(storage.flowStorage.get(STORAGE_KEYS.CODE_VERIFIER)).toBeNull();
    });

    it('should redirect to logout URL by default', () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: null,
          idToken: 'id-token',
          expiresAt: null,
          scope: null,
        },
        storage
      );

      logout(mockProviderWithLogout, storage);

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('https://auth.example.com/logout')
      );
    });

    it('should include id_token_hint in logout redirect', () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: null,
          idToken: 'my-id-token',
          expiresAt: null,
          scope: null,
        },
        storage
      );

      logout(mockProviderWithLogout, storage);

      expect(window.location.replace).toHaveBeenCalledWith(
        expect.stringContaining('id_token_hint=my-id-token')
      );
    });

    it('should not redirect when redirect option is false', () => {
      const storage = createMemoryStorageConfig();

      logout(mockProviderWithLogout, storage, { redirect: false });

      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('should not redirect when localOnly option is true', () => {
      const storage = createMemoryStorageConfig();

      logout(mockProviderWithLogout, storage, { localOnly: true });

      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('should not redirect when provider has no logout endpoint', () => {
      const storage = createMemoryStorageConfig();

      logout(mockProviderWithoutLogout, storage);

      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('should clear tokens before redirecting', () => {
      const storage = createMemoryStorageConfig();
      storeTokens(
        {
          accessToken: 'access',
          refreshToken: null,
          idToken: 'id',
          expiresAt: null,
          scope: null,
        },
        storage
      );

      logout(mockProviderWithLogout, storage);

      // Tokens should be cleared
      expect(storage.tokenStorage.get(STORAGE_KEYS.TOKENS)).toBeNull();
      // And redirect should have happened
      expect(window.location.replace).toHaveBeenCalled();
    });
  });
});
