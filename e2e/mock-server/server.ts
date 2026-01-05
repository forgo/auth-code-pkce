import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { URL, URLSearchParams } from 'url';
import { createHash, randomBytes } from 'crypto';

interface AuthCode {
  code: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  scope: string;
  nonce?: string;
  state?: string;
  userId: string;
  createdAt: number;
  used: boolean;
}

interface RefreshToken {
  token: string;
  userId: string;
  clientId: string;
  scope: string;
  createdAt: number;
  expiresAt: number;
}

interface MockOAuthServerConfig {
  port?: number;
  issuer?: string;
  accessTokenTtl?: number; // seconds
  refreshTokenTtl?: number; // seconds
  autoApprove?: boolean;
}

export class MockOAuthServer {
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;
  private issuer: string;
  private accessTokenTtl: number;
  private refreshTokenTtl: number;
  private autoApprove: boolean;

  // In-memory stores
  private authCodes: Map<string, AuthCode> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();

  // Mock user data
  private users = new Map([
    [
      'user-123',
      {
        sub: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        email_verified: true,
      },
    ],
    [
      'user-456',
      {
        sub: 'user-456',
        name: 'Admin User',
        email: 'admin@example.com',
        email_verified: true,
      },
    ],
  ]);

  constructor(config: MockOAuthServerConfig = {}) {
    this.port = config.port ?? 3456;
    this.issuer = config.issuer ?? `http://localhost:${this.port}`;
    this.accessTokenTtl = config.accessTokenTtl ?? 3600;
    this.refreshTokenTtl = config.refreshTokenTtl ?? 86400;
    this.autoApprove = config.autoApprove ?? true;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getIssuer(): string {
    return this.issuer;
  }

  getPort(): number {
    return this.port;
  }

  // For testing - manually set the token TTL
  setAccessTokenTtl(seconds: number): void {
    this.accessTokenTtl = seconds;
  }

  // For testing - clear all stored codes and tokens
  reset(): void {
    this.authCodes.clear();
    this.refreshTokens.clear();
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    const path = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    switch (path) {
      case '/.well-known/openid-configuration':
        this.handleDiscovery(req, res);
        break;
      case '/authorize':
        this.handleAuthorize(req, res, url);
        break;
      case '/token':
        this.handleToken(req, res);
        break;
      case '/userinfo':
        this.handleUserInfo(req, res);
        break;
      case '/logout':
      case '/end-session':
        this.handleLogout(req, res, url);
        break;
      case '/jwks':
        this.handleJwks(req, res);
        break;
      default:
        res.writeHead(404);
        res.end('Not Found');
    }
  }

  private handleDiscovery(_req: IncomingMessage, res: ServerResponse): void {
    const config = {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/authorize`,
      token_endpoint: `${this.issuer}/token`,
      userinfo_endpoint: `${this.issuer}/userinfo`,
      end_session_endpoint: `${this.issuer}/logout`,
      jwks_uri: `${this.issuer}/jwks`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
      code_challenge_methods_supported: ['S256', 'plain'],
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config));
  }

  private handleAuthorize(
    _req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ): void {
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const responseType = url.searchParams.get('response_type');
    const scope = url.searchParams.get('scope') || 'openid';
    const state = url.searchParams.get('state');
    const codeChallenge = url.searchParams.get('code_challenge');
    const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'plain';
    const nonce = url.searchParams.get('nonce');

    // Validate required params
    if (!clientId || !redirectUri || responseType !== 'code') {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        })
      );
      return;
    }

    // Validate PKCE (required for public clients)
    if (!codeChallenge) {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'code_challenge required for public clients',
        })
      );
      return;
    }

    if (codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Invalid code_challenge_method',
        })
      );
      return;
    }

    // Auto-approve and generate authorization code
    if (this.autoApprove) {
      const code = randomBytes(32).toString('hex');
      const userId = 'user-123'; // Default test user

      const authCode: AuthCode = {
        code,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
        clientId,
        scope,
        nonce: nonce || undefined,
        state: state || undefined,
        userId,
        createdAt: Date.now(),
        used: false,
      };

      this.authCodes.set(code, authCode);

      // Redirect with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      res.writeHead(302, { Location: redirectUrl.toString() });
      res.end();
    } else {
      // Return a simple HTML login form
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Mock OAuth Login</h1>
            <form method="POST" action="/authorize/callback">
              <input type="hidden" name="client_id" value="${clientId}" />
              <input type="hidden" name="redirect_uri" value="${redirectUri}" />
              <input type="hidden" name="scope" value="${scope}" />
              <input type="hidden" name="state" value="${state || ''}" />
              <input type="hidden" name="code_challenge" value="${codeChallenge}" />
              <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}" />
              <input type="hidden" name="nonce" value="${nonce || ''}" />
              <select name="user_id">
                <option value="user-123">Test User</option>
                <option value="user-456">Admin User</option>
              </select>
              <button type="submit">Login</button>
            </form>
          </body>
        </html>
      `);
    }
  }

  private handleToken(req: IncomingMessage, res: ServerResponse): void {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const params = new URLSearchParams(body);
      const grantType = params.get('grant_type');

      if (grantType === 'authorization_code') {
        this.handleAuthCodeExchange(params, res);
      } else if (grantType === 'refresh_token') {
        this.handleRefreshTokenExchange(params, res);
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'unsupported_grant_type',
            error_description: 'Grant type not supported',
          })
        );
      }
    });
  }

  private handleAuthCodeExchange(
    params: URLSearchParams,
    res: ServerResponse
  ): void {
    const code = params.get('code');
    const redirectUri = params.get('redirect_uri');
    const clientId = params.get('client_id');
    const codeVerifier = params.get('code_verifier');

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        })
      );
      return;
    }

    const authCode = this.authCodes.get(code);

    if (!authCode) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Authorization code not found',
        })
      );
      return;
    }

    // Check if code was already used (replay attack prevention)
    if (authCode.used) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Authorization code already used',
        })
      );
      return;
    }

    // Validate redirect_uri
    if (authCode.redirectUri !== redirectUri) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'redirect_uri mismatch',
        })
      );
      return;
    }

    // Validate client_id
    if (authCode.clientId !== clientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'client_id mismatch',
        })
      );
      return;
    }

    // Validate PKCE code_verifier
    let calculatedChallenge: string;
    if (authCode.codeChallengeMethod === 'S256') {
      calculatedChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    } else {
      calculatedChallenge = codeVerifier;
    }

    if (calculatedChallenge !== authCode.codeChallenge) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed',
        })
      );
      return;
    }

    // Check code expiration (5 minutes)
    if (Date.now() - authCode.createdAt > 5 * 60 * 1000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Authorization code expired',
        })
      );
      return;
    }

    // Mark code as used
    authCode.used = true;

    // Generate tokens
    const now = Math.floor(Date.now() / 1000);
    const user = this.users.get(authCode.userId);

    const accessToken = this.createJwt({
      sub: authCode.userId,
      iss: this.issuer,
      aud: clientId,
      iat: now,
      exp: now + this.accessTokenTtl,
      scope: authCode.scope,
    });

    const idToken = this.createJwt({
      sub: authCode.userId,
      iss: this.issuer,
      aud: clientId,
      iat: now,
      exp: now + this.accessTokenTtl,
      nonce: authCode.nonce,
      email: user?.email,
      name: user?.name,
    });

    // Create refresh token if offline_access scope requested
    let refreshToken: string | undefined;
    if (authCode.scope.includes('offline_access')) {
      refreshToken = randomBytes(32).toString('hex');
      this.refreshTokens.set(refreshToken, {
        token: refreshToken,
        userId: authCode.userId,
        clientId,
        scope: authCode.scope,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.refreshTokenTtl * 1000,
      });
    }

    const response: Record<string, unknown> = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.accessTokenTtl,
      id_token: idToken,
      scope: authCode.scope,
    };

    if (refreshToken) {
      response.refresh_token = refreshToken;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  private handleRefreshTokenExchange(
    params: URLSearchParams,
    res: ServerResponse
  ): void {
    const refreshToken = params.get('refresh_token');
    const clientId = params.get('client_id');

    if (!refreshToken || !clientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        })
      );
      return;
    }

    const storedToken = this.refreshTokens.get(refreshToken);

    if (!storedToken) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Refresh token not found',
        })
      );
      return;
    }

    if (storedToken.clientId !== clientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'client_id mismatch',
        })
      );
      return;
    }

    if (Date.now() > storedToken.expiresAt) {
      this.refreshTokens.delete(refreshToken);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Refresh token expired',
        })
      );
      return;
    }

    // Generate new tokens
    const now = Math.floor(Date.now() / 1000);
    const user = this.users.get(storedToken.userId);

    const accessToken = this.createJwt({
      sub: storedToken.userId,
      iss: this.issuer,
      aud: clientId,
      iat: now,
      exp: now + this.accessTokenTtl,
      scope: storedToken.scope,
    });

    const idToken = this.createJwt({
      sub: storedToken.userId,
      iss: this.issuer,
      aud: clientId,
      iat: now,
      exp: now + this.accessTokenTtl,
      email: user?.email,
      name: user?.name,
    });

    // Rotate refresh token
    this.refreshTokens.delete(refreshToken);
    const newRefreshToken = randomBytes(32).toString('hex');
    this.refreshTokens.set(newRefreshToken, {
      token: newRefreshToken,
      userId: storedToken.userId,
      clientId,
      scope: storedToken.scope,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.refreshTokenTtl * 1000,
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: this.accessTokenTtl,
        id_token: idToken,
        refresh_token: newRefreshToken,
        scope: storedToken.scope,
      })
    );
  }

  private handleUserInfo(req: IncomingMessage, res: ServerResponse): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_token',
          error_description: 'Missing or invalid Authorization header',
        })
      );
      return;
    }

    const token = authHeader.substring(7);
    const payload = this.decodeJwt(token);

    if (!payload) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_token',
          error_description: 'Invalid access token',
        })
      );
      return;
    }

    // Check expiration
    const exp = payload.exp as number | undefined;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'invalid_token',
          error_description: 'Access token expired',
        })
      );
      return;
    }

    const user = this.users.get(payload.sub as string);

    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'not_found',
          error_description: 'User not found',
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(user));
  }

  private handleLogout(
    _req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ): void {
    const postLogoutRedirectUri = url.searchParams.get('post_logout_redirect_uri');
    const state = url.searchParams.get('state');

    if (postLogoutRedirectUri) {
      const redirectUrl = new URL(postLogoutRedirectUri);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }
      res.writeHead(302, { Location: redirectUrl.toString() });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Logged out</h1></body></html>');
    }
  }

  private handleJwks(_req: IncomingMessage, res: ServerResponse): void {
    // Return an empty JWKS (we're using symmetric signing for simplicity)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ keys: [] }));
  }

  // Simple JWT creation (not cryptographically secure, just for testing)
  private createJwt(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    // In a real implementation, this would be a proper signature
    const signature = createHash('sha256')
      .update(`${encodedHeader}.${encodedPayload}.test-secret`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private decodeJwt(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    } catch {
      return null;
    }
  }
}

// Export for direct use
export function createMockOAuthServer(config?: MockOAuthServerConfig): MockOAuthServer {
  return new MockOAuthServer(config);
}
