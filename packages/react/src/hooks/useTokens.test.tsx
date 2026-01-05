import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { useTokens } from './useTokens.js';
import { AuthContext, type AuthContextValue } from '../context.js';
import type { JwtPayload, OAuthClient } from '@auth-code-pkce/core';

describe('hooks/useTokens', () => {
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

  it('should return getAccessToken and isAuthenticated', () => {
    const getAccessToken = vi.fn().mockResolvedValue('my-token');
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: true,
      isLoading: false,
      jwt: { sub: 'user-123' },
      user: null,
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken,
    };

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(contextValue),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(typeof result.current.getAccessToken).toBe('function');
  });

  it('should return false isAuthenticated when not logged in', () => {
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: false,
      isLoading: false,
      jwt: null,
      user: null,
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue(null),
    };

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(contextValue),
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should call getAccessToken correctly', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('access-token-123');
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: true,
      isLoading: false,
      jwt: { sub: 'user-123' },
      user: null,
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken,
    };

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(contextValue),
    });

    const token = await result.current.getAccessToken();
    expect(token).toBe('access-token-123');
    expect(getAccessToken).toHaveBeenCalled();
  });

  it('should throw error when used outside provider', () => {
    expect(() => renderHook(() => useTokens())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('should only return token-related properties', () => {
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

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(contextValue),
    });

    // Should only have getAccessToken and isAuthenticated
    expect(Object.keys(result.current)).toEqual(['getAccessToken', 'isAuthenticated']);
  });

  it('should handle getAccessToken returning null', async () => {
    const getAccessToken = vi.fn().mockResolvedValue(null);
    const contextValue: AuthContextValue<JwtPayload, unknown> = {
      isAuthenticated: false,
      isLoading: false,
      jwt: null,
      user: null,
      error: null,
      client: mockClient,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken,
    };

    const { result } = renderHook(() => useTokens(), {
      wrapper: createWrapper(contextValue),
    });

    const token = await result.current.getAccessToken();
    expect(token).toBeNull();
  });
});
