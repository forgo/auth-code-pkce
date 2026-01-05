import { vi } from 'vitest';
import type { HttpClient, HttpResponse, HttpRequest } from '../types/http.js';
import type { TokenResponse } from '../types/oauth.js';

/**
 * Create a mock HTTP client with predefined responses
 */
export function createMockHttpClient(
  responses: Map<string, HttpResponse<unknown>> = new Map()
): HttpClient & { request: ReturnType<typeof vi.fn> } {
  const mockRequest = vi.fn(async <T>(req: HttpRequest): Promise<HttpResponse<T>> => {
    const response = responses.get(req.url);
    if (!response) {
      throw new Error(`No mock response for ${req.url}`);
    }
    return response as HttpResponse<T>;
  });

  return {
    request: mockRequest,
  };
}

/**
 * Create a mock JWT for testing
 */
export function createMockJwt(payload: Record<string, unknown> = {}): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const fullPayload = {
    iss: 'https://test.auth.com',
    aud: 'test-client-id',
    sub: 'user-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  return `${encode(header)}.${encode(fullPayload)}.mock-signature`;
}

/**
 * Default mock token response
 */
export const mockTokenResponse: TokenResponse = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  id_token: createMockJwt({ sub: 'user-123', email: 'test@example.com' }),
  scope: 'openid profile email',
};

/**
 * Create a successful token response
 */
export function createMockTokenResponse(
  overrides: Partial<TokenResponse> = {}
): HttpResponse<TokenResponse> {
  return {
    status: 200,
    data: {
      ...mockTokenResponse,
      ...overrides,
    },
  };
}

/**
 * Create an error token response
 */
export function createMockTokenErrorResponse(
  error: string = 'invalid_grant',
  description?: string
): HttpResponse<{ error: string; error_description?: string }> {
  return {
    status: 400,
    data: {
      error,
      error_description: description,
    },
  };
}
