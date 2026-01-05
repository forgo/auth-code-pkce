import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockOAuthServer, createMockOAuthServer } from './server.js';

describe('E2E: Mock OAuth Server', () => {
  let server: MockOAuthServer;
  let issuer: string;

  beforeAll(async () => {
    server = createMockOAuthServer({ port: 3457, autoApprove: true });
    await server.start();
    issuer = server.getIssuer();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  describe('Discovery Endpoint', () => {
    it('should return OpenID Connect configuration', async () => {
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await response.json();

      expect(config.issuer).toBe(issuer);
      expect(config.authorization_endpoint).toBe(`${issuer}/authorize`);
      expect(config.token_endpoint).toBe(`${issuer}/token`);
      expect(config.userinfo_endpoint).toBe(`${issuer}/userinfo`);
    });

    it('should include PKCE code challenge methods', async () => {
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await response.json();

      expect(config.code_challenge_methods_supported).toContain('S256');
      expect(config.code_challenge_methods_supported).toContain('plain');
    });

    it('should support authorization_code and refresh_token grants', async () => {
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await response.json();

      expect(config.grant_types_supported).toContain('authorization_code');
      expect(config.grant_types_supported).toContain('refresh_token');
    });
  });

  describe('Authorization Endpoint', () => {
    it('should redirect with authorization code', async () => {
      const params = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'test-state',
        code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        code_challenge_method: 'S256',
      });

      const response = await fetch(`${issuer}/authorize?${params}`, {
        redirect: 'manual',
      });

      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('http://localhost:3000/callback');
      expect(location).toContain('code=');
      expect(location).toContain('state=test-state');
    });

    it('should reject request without code_challenge', async () => {
      const params = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
      });

      const response = await fetch(`${issuer}/authorize?${params}`);

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('invalid_request');
    });

    it('should reject invalid code_challenge_method', async () => {
      const params = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        code_challenge: 'test',
        code_challenge_method: 'invalid',
      });

      const response = await fetch(`${issuer}/authorize?${params}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Token Endpoint', () => {
    it('should exchange code with valid PKCE verifier', async () => {
      // First, get an authorization code
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      // SHA256 of the verifier, base64url encoded
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const callbackUrl = new URL(location!);
      const code = callbackUrl.searchParams.get('code');

      // Exchange the code
      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'test-client',
          code_verifier: codeVerifier,
        }),
      });

      expect(tokenResponse.status).toBe(200);
      const tokens = await tokenResponse.json();

      expect(tokens.access_token).toBeDefined();
      expect(tokens.id_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBeGreaterThan(0);
    });

    it('should reject wrong PKCE verifier', async () => {
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const callbackUrl = new URL(location!);
      const code = callbackUrl.searchParams.get('code');

      // Try with wrong verifier
      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'test-client',
          code_verifier: 'wrong-verifier',
        }),
      });

      expect(tokenResponse.status).toBe(400);
      const error = await tokenResponse.json();
      expect(error.error).toBe('invalid_grant');
      expect(error.error_description).toContain('PKCE');
    });

    it('should reject code reuse (replay attack)', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const callbackUrl = new URL(location!);
      const code = callbackUrl.searchParams.get('code');

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'test-client',
        code_verifier: codeVerifier,
      });

      // First exchange should succeed
      const firstResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams,
      });

      expect(firstResponse.status).toBe(200);

      // Second exchange with same code should fail
      const secondResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams,
      });

      expect(secondResponse.status).toBe(400);
      const error = await secondResponse.json();
      expect(error.error).toBe('invalid_grant');
      expect(error.error_description).toContain('already used');
    });

    it('should reject invalid client_id', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const callbackUrl = new URL(location!);
      const code = callbackUrl.searchParams.get('code');

      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'wrong-client',
          code_verifier: codeVerifier,
        }),
      });

      expect(tokenResponse.status).toBe(400);
      const error = await tokenResponse.json();
      expect(error.error).toBe('invalid_grant');
    });

    it('should include refresh_token when offline_access scope requested', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile offline_access',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const callbackUrl = new URL(location!);
      const code = callbackUrl.searchParams.get('code');

      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'test-client',
          code_verifier: codeVerifier,
        }),
      });

      expect(tokenResponse.status).toBe(200);
      const tokens = await tokenResponse.json();

      expect(tokens.refresh_token).toBeDefined();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens with valid refresh_token', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      // Get initial tokens
      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile offline_access',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const code = new URL(location!).searchParams.get('code');

      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'test-client',
          code_verifier: codeVerifier,
        }),
      });

      const tokens = await tokenResponse.json();

      // Wait a bit so the token timestamp will be different
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Refresh tokens
      const refreshResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          client_id: 'test-client',
        }),
      });

      expect(refreshResponse.status).toBe(200);
      const newTokens = await refreshResponse.json();

      expect(newTokens.access_token).toBeDefined();
      expect(newTokens.access_token).not.toBe(tokens.access_token);
      expect(newTokens.refresh_token).toBeDefined();
      expect(newTokens.refresh_token).not.toBe(tokens.refresh_token);
    });

    it('should reject invalid refresh_token', async () => {
      const refreshResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: 'invalid-refresh-token',
          client_id: 'test-client',
        }),
      });

      expect(refreshResponse.status).toBe(400);
      const error = await refreshResponse.json();
      expect(error.error).toBe('invalid_grant');
    });
  });

  describe('UserInfo Endpoint', () => {
    it('should return user info with valid access token', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const authParams = new URLSearchParams({
        client_id: 'test-client',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'openid profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authResponse = await fetch(`${issuer}/authorize?${authParams}`, {
        redirect: 'manual',
      });

      const location = authResponse.headers.get('Location');
      const code = new URL(location!).searchParams.get('code');

      const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: 'http://localhost:3000/callback',
          client_id: 'test-client',
          code_verifier: codeVerifier,
        }),
      });

      const tokens = await tokenResponse.json();

      const userInfoResponse = await fetch(`${issuer}/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      expect(userInfoResponse.status).toBe(200);
      const userInfo = await userInfoResponse.json();

      expect(userInfo.sub).toBe('user-123');
      expect(userInfo.email).toBe('test@example.com');
      expect(userInfo.name).toBe('Test User');
    });

    it('should reject request without authorization header', async () => {
      const response = await fetch(`${issuer}/userinfo`);

      expect(response.status).toBe(401);
    });

    it('should reject invalid access token', async () => {
      const response = await fetch(`${issuer}/userinfo`, {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Endpoint', () => {
    it('should redirect to post_logout_redirect_uri', async () => {
      const params = new URLSearchParams({
        post_logout_redirect_uri: 'http://localhost:3000/',
        state: 'logout-state',
      });

      const response = await fetch(`${issuer}/logout?${params}`, {
        redirect: 'manual',
      });

      expect(response.status).toBe(302);
      const location = response.headers.get('Location');
      expect(location).toContain('http://localhost:3000/');
      expect(location).toContain('state=logout-state');
    });

    it('should return HTML when no redirect_uri', async () => {
      const response = await fetch(`${issuer}/logout`);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('Logged out');
    });
  });
});

// Note: OAuthClient integration tests are not included here because the OAuthClient
// is designed for browser environments and requires window.location to be properly
// configured. For browser-based E2E testing, use Playwright or Cypress.
//
// The mock server tests above verify the OAuth 2.0 + PKCE flow at the HTTP level,
// which is sufficient for testing the server behavior. The OAuthClient itself is
// tested in unit tests with proper browser mocks.
