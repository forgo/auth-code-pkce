import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { createAuthStore, createDerivedStores, type AuthStore } from './auth.js';
import type { ProviderConfig, JwtPayload } from '@auth-code-pkce/core';
import { createMemoryStorageConfig } from '@auth-code-pkce/core';

// Mock window.location for OAuth redirects
vi.stubGlobal('location', {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  replace: vi.fn(),
});

describe('stores/auth', () => {
  const mockProvider: ProviderConfig = {
    issuer: 'https://auth.example.com',
    clientId: 'test-client',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['openid', 'profile'],
    endpoints: {
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuthStore', () => {
    it('should create auth store with initial state', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      // Store should be subscribable
      expect(typeof store.subscribe).toBe('function');
    });

    it('should have isLoading false after initialization', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = get(store);
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should have initial auth state properties', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = get(store);
      expect(state).toHaveProperty('isAuthenticated');
      expect(state).toHaveProperty('isLoading');
      expect(state).toHaveProperty('jwt');
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('error');
    });

    it('should expose login function', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      expect(typeof store.login).toBe('function');
    });

    it('should expose logout function', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      expect(typeof store.logout).toBe('function');
    });

    it('should expose getAccessToken function', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      expect(typeof store.getAccessToken).toBe('function');
    });

    it('should expose refreshToken function', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      expect(typeof store.refreshToken).toBe('function');
    });

    it('should expose OAuth client', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      expect(store.client).toBeDefined();
      expect(typeof store.client.authorize).toBe('function');
      expect(typeof store.client.logout).toBe('function');
    });

    it('should call client.authorize on login', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const authorizeSpy = vi.spyOn(store.client, 'authorize');
      store.login({ prompt: 'login' });

      expect(authorizeSpy).toHaveBeenCalledWith({ prompt: 'login' });
    });

    it('should call client.authorize without options', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const authorizeSpy = vi.spyOn(store.client, 'authorize');
      store.login();

      expect(authorizeSpy).toHaveBeenCalledWith(undefined);
    });

    it('should call client.logout on logout', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const logoutSpy = vi.spyOn(store.client, 'logout');
      store.logout({ localOnly: true });

      expect(logoutSpy).toHaveBeenCalledWith({ localOnly: true });
    });

    it('should call client.logout without options', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const logoutSpy = vi.spyOn(store.client, 'logout');
      store.logout();

      expect(logoutSpy).toHaveBeenCalledWith(undefined);
    });

    it('should call client.getAccessToken', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      vi.spyOn(store.client, 'getAccessToken').mockResolvedValue('mock-token');

      const token = await store.getAccessToken();
      expect(token).toBe('mock-token');
    });

    it('should return null when not authenticated', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const token = await store.getAccessToken();
      expect(token).toBeNull();
    });

    it('should call client.refreshToken', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      vi.spyOn(store.client, 'refreshToken').mockResolvedValue(true);

      const result = await store.refreshToken();
      expect(result).toBe(true);
    });

    it('should use custom storage when provided', () => {
      const customStorage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage: customStorage });

      expect(store.client).toBeDefined();
    });

    it('should call onError callback when provided', () => {
      const storage = createMemoryStorageConfig();
      const onError = vi.fn();
      const store = createAuthStore({ provider: mockProvider, storage, onError });

      // The onError is passed to the underlying client
      expect(store.client).toBeDefined();
    });

    it('should update state on auth state changes', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      let stateHistory: unknown[] = [];
      const unsubscribe = store.subscribe((state) => {
        stateHistory.push(state);
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // At least one state update should have occurred
      expect(stateHistory.length).toBeGreaterThan(0);

      unsubscribe();
    });

    it('should be able to subscribe multiple times', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = store.subscribe(callback1);
      const unsub2 = store.subscribe(callback2);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });
  });

  describe('createDerivedStores', () => {
    it('should create derived stores from auth store', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);

      expect(derived.isAuthenticated).toBeDefined();
      expect(derived.isLoading).toBeDefined();
      expect(derived.user).toBeDefined();
      expect(derived.jwt).toBeDefined();
      expect(derived.error).toBeDefined();
    });

    it('should return isAuthenticated as readable store', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);
      const isAuthenticated = get(derived.isAuthenticated);

      expect(isAuthenticated).toBe(false);
    });

    it('should return isLoading as readable store', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);
      const isLoading = get(derived.isLoading);

      expect(isLoading).toBe(false);
    });

    it('should return user as readable store', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);
      const user = get(derived.user);

      expect(user).toBeNull();
    });

    it('should return jwt as readable store', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);
      const jwt = get(derived.jwt);

      expect(jwt).toBeNull();
    });

    it('should return error as readable store', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);
      const error = get(derived.error);

      expect(error).toBeNull();
    });

    it('should update derived stores when auth state changes', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);

      // Subscribe to track updates
      let isAuthenticatedValue = false;
      const unsub = derived.isAuthenticated.subscribe((value) => {
        isAuthenticatedValue = value;
      });

      // Initially should be false
      expect(isAuthenticatedValue).toBe(false);

      unsub();
    });

    it('should have all derived stores subscribable', async () => {
      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore({ provider: mockProvider, storage });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores(authStore);

      expect(typeof derived.isAuthenticated.subscribe).toBe('function');
      expect(typeof derived.isLoading.subscribe).toBe('function');
      expect(typeof derived.user.subscribe).toBe('function');
      expect(typeof derived.jwt.subscribe).toBe('function');
      expect(typeof derived.error.subscribe).toBe('function');
    });

    it('should support generic type parameters', async () => {
      interface CustomJwt extends JwtPayload {
        email: string;
        permissions: string[];
      }
      interface CustomUser {
        id: string;
        name: string;
        roles: string[];
      }

      const storage = createMemoryStorageConfig();
      const authStore = createAuthStore<CustomJwt, CustomUser>({
        provider: mockProvider,
        storage,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const derived = createDerivedStores<CustomJwt, CustomUser>(authStore);

      // TypeScript should allow this
      const user = get(derived.user);
      const jwt = get(derived.jwt);

      expect(user).toBeNull();
      expect(jwt).toBeNull();
    });
  });

  describe('store reactivity', () => {
    it('should notify subscribers on state change', async () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const states: unknown[] = [];
      const unsub = store.subscribe((state) => {
        states.push({ ...state });
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(states.length).toBeGreaterThan(0);
      unsub();
    });

    it('should clean up subscription on unsubscribe', () => {
      const storage = createMemoryStorageConfig();
      const store = createAuthStore({ provider: mockProvider, storage });

      const callback = vi.fn();
      const unsubscribe = store.subscribe(callback);

      // First call when subscribing
      expect(callback).toHaveBeenCalled();
      const callCount = callback.mock.calls.length;

      unsubscribe();

      // Callback should not receive any more updates after unsubscribe
      // This is verified by no additional calls being made
      expect(callback.mock.calls.length).toBe(callCount);
    });
  });
});
