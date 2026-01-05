import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseCallbackUrl,
  isCallbackUrl,
  buildUrl,
  getCurrentPath,
  getCurrentOrigin,
} from './url.js';
import { mockWindowLocation } from '../__mocks__/browser.js';

describe('utils/url', () => {
  describe('parseCallbackUrl', () => {
    it('should parse code and state from URL', () => {
      const result = parseCallbackUrl(
        'http://localhost:3000/callback?code=abc123&state=xyz789'
      );

      expect(result.code).toBe('abc123');
      expect(result.state).toBe('xyz789');
      expect(result.error).toBeNull();
      expect(result.errorDescription).toBeNull();
    });

    it('should parse error from URL', () => {
      const result = parseCallbackUrl(
        'http://localhost:3000/callback?error=access_denied&error_description=User%20denied'
      );

      expect(result.code).toBeNull();
      expect(result.error).toBe('access_denied');
      expect(result.errorDescription).toBe('User denied');
    });

    it('should handle missing parameters', () => {
      const result = parseCallbackUrl('http://localhost:3000/callback');

      expect(result.code).toBeNull();
      expect(result.state).toBeNull();
      expect(result.error).toBeNull();
      expect(result.errorDescription).toBeNull();
    });

    it('should use window.location.href when no URL provided', () => {
      mockWindowLocation('http://localhost:3000/callback?code=from-window&state=test');

      const result = parseCallbackUrl();
      expect(result.code).toBe('from-window');
      expect(result.state).toBe('test');
    });

    it('should return nulls for invalid URL', () => {
      const result = parseCallbackUrl('not-a-valid-url');

      expect(result.code).toBeNull();
      expect(result.state).toBeNull();
      expect(result.error).toBeNull();
      expect(result.errorDescription).toBeNull();
    });

    it('should handle URL with only code', () => {
      const result = parseCallbackUrl('http://localhost:3000/callback?code=abc');
      expect(result.code).toBe('abc');
      expect(result.state).toBeNull();
    });

    it('should handle URL with only error', () => {
      const result = parseCallbackUrl('http://localhost:3000/callback?error=server_error');
      expect(result.error).toBe('server_error');
      expect(result.code).toBeNull();
    });

    it('should decode URL-encoded values', () => {
      const result = parseCallbackUrl(
        'http://localhost:3000/callback?error_description=Access%20was%20denied%20by%20user'
      );
      expect(result.errorDescription).toBe('Access was denied by user');
    });
  });

  describe('isCallbackUrl', () => {
    it('should return true for valid callback with code', () => {
      expect(
        isCallbackUrl(
          'http://localhost:3000/callback',
          'http://localhost:3000/callback?code=abc&state=xyz'
        )
      ).toBe(true);
    });

    it('should return true for callback with error', () => {
      expect(
        isCallbackUrl(
          'http://localhost:3000/callback',
          'http://localhost:3000/callback?error=access_denied'
        )
      ).toBe(true);
    });

    it('should return false when path does not match', () => {
      expect(
        isCallbackUrl(
          'http://localhost:3000/callback',
          'http://localhost:3000/other-path?code=abc'
        )
      ).toBe(false);
    });

    it('should return false when no code or error', () => {
      expect(
        isCallbackUrl(
          'http://localhost:3000/callback',
          'http://localhost:3000/callback'
        )
      ).toBe(false);
    });

    it('should use window.location.href when no URL provided', () => {
      mockWindowLocation('http://localhost:3000/callback?code=abc');

      expect(isCallbackUrl('http://localhost:3000/callback')).toBe(true);
    });

    it('should handle relative redirect URI', () => {
      expect(
        isCallbackUrl('/callback', 'http://localhost:3000/callback?code=abc')
      ).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isCallbackUrl('http://localhost:3000/callback', 'invalid-url')).toBe(false);
    });

    it('should match exact path', () => {
      expect(
        isCallbackUrl(
          'http://localhost:3000/callback',
          'http://localhost:3000/callback/extra?code=abc'
        )
      ).toBe(false);
    });
  });

  describe('buildUrl', () => {
    it('should build URL with params', () => {
      const url = buildUrl('https://auth.example.com/authorize', {
        client_id: 'test',
        response_type: 'code',
        scope: 'openid profile',
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get('client_id')).toBe('test');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('scope')).toBe('openid profile');
    });

    it('should skip undefined params', () => {
      const url = buildUrl('https://example.com', {
        present: 'yes',
        missing: undefined,
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get('present')).toBe('yes');
      expect(parsed.searchParams.has('missing')).toBe(false);
    });

    it('should preserve existing query params', () => {
      const url = buildUrl('https://example.com?existing=value', {
        new: 'param',
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get('existing')).toBe('value');
      expect(parsed.searchParams.get('new')).toBe('param');
    });

    it('should encode special characters', () => {
      const url = buildUrl('https://example.com', {
        param: 'value with spaces & special=chars',
      });

      expect(url).toContain('value+with+spaces');
      expect(url).toContain('%26');
    });

    it('should handle empty params object', () => {
      const url = buildUrl('https://example.com/path', {});
      expect(url).toBe('https://example.com/path');
    });
  });

  describe('getCurrentPath', () => {
    it('should return pathname + search + hash', () => {
      mockWindowLocation('http://localhost:3000/dashboard?tab=settings#section');

      expect(getCurrentPath()).toBe('/dashboard?tab=settings#section');
    });

    it('should return just pathname when no query or hash', () => {
      mockWindowLocation('http://localhost:3000/dashboard');

      expect(getCurrentPath()).toBe('/dashboard');
    });

    it('should return pathname with only query', () => {
      mockWindowLocation('http://localhost:3000/page?foo=bar');

      expect(getCurrentPath()).toBe('/page?foo=bar');
    });

    it('should return pathname with only hash', () => {
      mockWindowLocation('http://localhost:3000/page#section');

      expect(getCurrentPath()).toBe('/page#section');
    });

    it('should handle root path', () => {
      mockWindowLocation('http://localhost:3000/');

      expect(getCurrentPath()).toBe('/');
    });
  });

  describe('getCurrentOrigin', () => {
    it('should return origin', () => {
      mockWindowLocation('http://localhost:3000/dashboard');

      expect(getCurrentOrigin()).toBe('http://localhost:3000');
    });

    it('should include port', () => {
      mockWindowLocation('http://localhost:8080/path');

      expect(getCurrentOrigin()).toBe('http://localhost:8080');
    });

    it('should handle https', () => {
      mockWindowLocation('https://example.com/path');

      expect(getCurrentOrigin()).toBe('https://example.com');
    });
  });
});
