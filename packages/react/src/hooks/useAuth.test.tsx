import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { useAuth } from './useAuth.js';
import { AuthContext, type AuthContextValue } from '../context.js';
import type { JwtPayload, OAuthClient } from '@auth-code-pkce/core';

describe('hooks/useAuth', () => {
  const createWrapper = (value: AuthContextValue<JwtPayload, unknown>) => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return React.createElement(AuthContext.Provider, { value }, children);
    };
  };

  const mockClient = {
    getState: vi.fn(),
    initialize: vi.fn(),
    authorize: vi.fn(),
    handleCallback: vi.fn(),
    refreshToken: vi.fn(),
    getAccessToken: vi.fn(),
    logout: vi.fn(),
    subscribe: vi.fn(),
  } as unknown as OAuthClient<JwtPayload, unknown>;

  const mockContextValue: AuthContextValue<JwtPayload, unknown> = {
    isAuthenticated: true,
    isLoading: false,
    jwt: { sub: 'user-123' },
    user: { name: 'Test User' },
    error: null,
    client: mockClient,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('token'),
  };

  it('should return auth context value', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockContextValue),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.jwt?.sub).toBe('user-123');
    expect(result.current.user).toEqual({ name: 'Test User' });
  });

  it('should throw error when used outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('should expose login function', () => {
    const login = vi.fn();
    const contextValue = { ...mockContextValue, login };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(contextValue),
    });

    result.current.login({ prompt: 'login' });
    expect(login).toHaveBeenCalledWith({ prompt: 'login' });
  });

  it('should expose logout function', () => {
    const logout = vi.fn();
    const contextValue = { ...mockContextValue, logout };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(contextValue),
    });

    result.current.logout({ localOnly: true });
    expect(logout).toHaveBeenCalledWith({ localOnly: true });
  });

  it('should expose getAccessToken function', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('my-token');
    const contextValue = { ...mockContextValue, getAccessToken };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(contextValue),
    });

    const token = await result.current.getAccessToken();
    expect(token).toBe('my-token');
  });

  it('should return all auth state properties', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockContextValue),
    });

    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('jwt');
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('client');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('getAccessToken');
  });

  it('should return loading state correctly', () => {
    const loadingContextValue = {
      ...mockContextValue,
      isAuthenticated: false,
      isLoading: true,
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(loadingContextValue),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return error state when present', () => {
    const errorContextValue = {
      ...mockContextValue,
      error: { code: 'token_exchange_failed' as const, message: 'Exchange failed' },
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(errorContextValue),
    });

    expect(result.current.error?.code).toBe('token_exchange_failed');
    expect(result.current.error?.message).toBe('Exchange failed');
  });

  it('should support generic type parameters', () => {
    interface CustomJwt extends JwtPayload {
      email: string;
    }
    interface CustomUser {
      id: string;
      name: string;
    }

    const customContextValue: AuthContextValue<CustomJwt, CustomUser> = {
      isAuthenticated: true,
      isLoading: false,
      jwt: { sub: 'user-123', email: 'test@example.com' },
      user: { id: '123', name: 'Test' },
      error: null,
      client: mockClient as OAuthClient<CustomJwt, CustomUser>,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    };

    const { result } = renderHook(() => useAuth<CustomJwt, CustomUser>(), {
      wrapper: createWrapper(customContextValue as AuthContextValue),
    });

    expect(result.current.jwt?.email).toBe('test@example.com');
    expect(result.current.user?.name).toBe('Test');
  });
});
