import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { useUser } from './useUser.js';
import { AuthContext, type AuthContextValue } from '../context.js';
import type { JwtPayload, OAuthClient } from '@auth-code-pkce/core';

describe('hooks/useUser', () => {
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

  it('should return user, jwt, and isLoading', () => {
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: true,
      isLoading: false,
      jwt: { sub: 'user-123', email: 'test@example.com' },
      user: { id: '123', name: 'Test User' },
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    };

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(contextValue),
    });

    expect(result.current.user).toEqual({ id: '123', name: 'Test User' });
    expect(result.current.jwt?.sub).toBe('user-123');
    expect(result.current.isLoading).toBe(false);
  });

  it('should return null user when not authenticated', () => {
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: false,
      isLoading: false,
      jwt: null,
      user: null,
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    };

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(contextValue),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.jwt).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return loading state', () => {
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: false,
      isLoading: true,
      jwt: null,
      user: null,
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    };

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(contextValue),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should throw error when used outside provider', () => {
    expect(() => renderHook(() => useUser())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('should support generic type parameters', () => {
    interface CustomUser {
      id: string;
      name: string;
      roles: string[];
    }
    interface CustomJwt extends JwtPayload {
      email: string;
      permissions: string[];
    }

    const contextValue: AuthContextValue<CustomJwt, CustomUser> = {
      isAuthenticated: true,
      isLoading: false,
      jwt: { sub: 'user-123', email: 'test@example.com', permissions: ['read', 'write'] },
      user: { id: '123', name: 'Test', roles: ['admin'] },
      error: null,
      client: mockClient as OAuthClient<CustomJwt, CustomUser>,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    };

    const { result } = renderHook(() => useUser<CustomUser, CustomJwt>(), {
      wrapper: createWrapper(contextValue as AuthContextValue),
    });

    expect(result.current.user?.roles).toEqual(['admin']);
    expect(result.current.jwt?.permissions).toEqual(['read', 'write']);
  });

  it('should only return user-related properties', () => {
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: true,
      isLoading: false,
      jwt: { sub: 'user-123' },
      user: { name: 'Test' },
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    };

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(contextValue),
    });

    // Should only have user, jwt, isLoading
    expect(Object.keys(result.current)).toEqual(['user', 'jwt', 'isLoading']);
  });
});
