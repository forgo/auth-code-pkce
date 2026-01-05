/**
 * Base provider initializer with common logic
 *
 * Provides shared utilities for HTTP requests, health checking,
 * Docker exec, and the template method pattern for initialization.
 */

import { execSync } from 'child_process';
import type {
  ProviderInitializer,
  ProviderInitOptions,
  AuthContext,
  ApiResult,
} from './types.js';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

export abstract class BaseProviderInitializer implements ProviderInitializer {
  abstract readonly name: string;
  abstract readonly version: string;

  /**
   * Log info message
   */
  protected log(message: string): void {
    console.log(`${colors.green}[INFO]${colors.reset} ${message}`);
  }

  /**
   * Log warning message
   */
  protected warn(message: string): void {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`);
  }

  /**
   * Log error message
   */
  protected error(message: string): void {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
  }

  /**
   * Make an HTTP request and return JSON
   */
  protected async fetchJson<T>(
    url: string,
    options: RequestInit & { auth?: AuthContext } = {}
  ): Promise<ApiResult<T>> {
    const { auth, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add authentication headers
    if (auth?.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }
    if (auth?.csrfToken) {
      headers['X-authentik-CSRF'] = auth.csrfToken;
    }

    // Build cookie header from auth context
    if (auth?.cookies && Object.keys(auth.cookies).length > 0) {
      headers['Cookie'] = Object.entries(auth.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      let data: T | undefined;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          data = (await response.json()) as T;
        } catch {
          // Ignore JSON parse errors for empty responses
        }
      }

      return {
        success: response.ok,
        data,
        statusCode: response.status,
        error: response.ok ? undefined : JSON.stringify(data) || response.statusText,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Wait for a health endpoint to return OK
   */
  protected async waitForHealthy(
    healthUrl: string,
    timeout: number = 120000,
    interval: number = 2000
  ): Promise<void> {
    const startTime = Date.now();
    let lastError: string | undefined;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          return;
        }
        lastError = `Health check returned ${response.status}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      process.stdout.write('.');
      await this.sleep(interval);
    }

    throw new Error(
      `Timeout waiting for provider at ${healthUrl}: ${lastError}`
    );
  }

  /**
   * Sleep for a number of milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a command in a Docker container
   */
  protected execInContainer(containerName: string, command: string[]): string {
    const cmd = ['docker', 'exec', containerName, ...command];
    return execSync(cmd.join(' '), { encoding: 'utf-8' });
  }

  /**
   * Parse Set-Cookie header into a cookie object
   */
  protected parseCookiesFromResponse(response: Response): Record<string, string> {
    const cookies: Record<string, string> = {};
    const setCookieHeaders = response.headers.getSetCookie?.() || [];

    for (const header of setCookieHeaders) {
      const [nameValue] = header.split(';');
      const [name, ...valueParts] = nameValue.split('=');
      if (name && valueParts.length > 0) {
        cookies[name.trim()] = valueParts.join('=').trim();
      }
    }

    return cookies;
  }

  // Abstract methods to be implemented by subclasses
  abstract waitForReady(options: ProviderInitOptions): Promise<void>;
  abstract authenticate(options: ProviderInitOptions): Promise<AuthContext>;
  abstract createOAuthClient(
    options: ProviderInitOptions,
    auth: AuthContext
  ): Promise<ApiResult<{ clientId: string; providerId?: string }>>;
  abstract createTestUsers(
    options: ProviderInitOptions,
    auth: AuthContext
  ): Promise<ApiResult<void>>;

  /**
   * Full initialization workflow (template method)
   */
  async initialize(options: ProviderInitOptions): Promise<void> {
    console.log('');
    this.log(`Initializing ${this.name} ${this.version}...`);
    this.log(`URL: ${options.baseUrl}`);
    this.log(`Container: ${options.containerName}`);
    console.log('');

    await this.waitForReady(options);

    const auth = await this.authenticate(options);

    const clientResult = await this.createOAuthClient(options, auth);
    if (!clientResult.success) {
      throw new Error(`Failed to create OAuth client: ${clientResult.error}`);
    }

    const usersResult = await this.createTestUsers(options, auth);
    if (!usersResult.success) {
      throw new Error(`Failed to create test users: ${usersResult.error}`);
    }

    console.log('');
    this.log(`${this.name} ${this.version} initialization complete!`);
    console.log('');
    console.log(`OAuth2 Provider: test-spa-provider`);
    console.log(`Application: test-spa`);
    console.log(`Client ID: ${options.client.clientId}`);
    console.log(`Test User: ${options.testUsers[0]?.username} / ${options.testUsers[0]?.password}`);
    console.log('');
  }
}
