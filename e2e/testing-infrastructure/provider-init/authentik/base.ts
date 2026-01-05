/**
 * Base class for all Authentik versions
 *
 * Contains common Authentik API patterns like:
 * - Recovery token authentication
 * - Flow retrieval
 * - User creation
 * - Application creation
 */

import { BaseProviderInitializer } from '../base-initializer.js';
import type {
  ProviderInitOptions,
  AuthContext,
  ApiResult,
} from '../types.js';

/**
 * Authentik API response types
 */
interface AuthentikPaginatedResponse<T> {
  pagination: { count: number };
  results: T[];
}

interface AuthentikFlow {
  pk: string;
  slug: string;
  name: string;
}

interface AuthentikProvider {
  pk: number;
  name: string;
  property_mappings?: string[];
}

interface AuthentikApplication {
  slug: string;
  name: string;
  provider: number;
}

interface AuthentikUser {
  pk: number;
  username: string;
}

interface AuthentikPropertyMapping {
  pk: string;
  name: string;
  managed?: string;
}

export abstract class AuthentikBaseInitializer extends BaseProviderInitializer {
  readonly name = 'Authentik';

  /**
   * Wait for Authentik to be ready
   */
  async waitForReady(options: ProviderInitOptions): Promise<void> {
    this.log(`Waiting for Authentik to be ready at ${options.baseUrl}...`);
    await this.waitForHealthy(
      `${options.baseUrl}/-/health/ready/`,
      options.timeout || 120000
    );
    this.log('Authentik is ready!');
  }

  /**
   * Authenticate using recovery token
   */
  async authenticate(options: ProviderInitOptions): Promise<AuthContext> {
    this.log('Creating recovery token and authenticating...');

    // Create recovery token via docker exec
    const output = this.execInContainer(options.containerName, [
      'ak',
      'create_recovery_key',
      '999',
      'akadmin',
    ]);

    const recoveryPath = output.match(/\/recovery\/use-token\/[^/]*\//)?.[0];
    if (!recoveryPath) {
      throw new Error(`Failed to extract recovery token from output: ${output}`);
    }

    // Use recovery token to get session cookies
    const response = await fetch(`${options.baseUrl}${recoveryPath}`, {
      redirect: 'manual',
    });

    const cookies = this.parseCookiesFromResponse(response);
    const csrfToken = cookies['authentik_csrf'];

    if (!csrfToken) {
      throw new Error('Failed to get CSRF token from recovery response');
    }

    // Follow redirect to complete authentication
    const location = response.headers.get('location');
    if (location) {
      await fetch(`${options.baseUrl}${location}`, {
        headers: {
          Cookie: Object.entries(cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; '),
        },
        redirect: 'manual',
      });
    }

    // Verify authentication
    const verifyResult = await this.fetchJson<{ user: { username: string } }>(
      `${options.baseUrl}/api/v3/core/users/me/`,
      { auth: { cookies, csrfToken } }
    );

    if (!verifyResult.success || !verifyResult.data?.user?.username) {
      throw new Error('Failed to verify authentication');
    }

    this.log(`Authenticated as: ${verifyResult.data.user.username}`);
    return { cookies, csrfToken };
  }

  /**
   * Get the default authorization flow
   */
  protected async getAuthorizationFlow(
    baseUrl: string,
    auth: AuthContext
  ): Promise<string> {
    this.log('Getting authorization flow...');

    // Try implicit consent first
    let result = await this.fetchJson<AuthentikPaginatedResponse<AuthentikFlow>>(
      `${baseUrl}/api/v3/flows/instances/?slug=default-provider-authorization-implicit-consent`,
      { auth }
    );

    if (result.data?.results?.[0]?.pk) {
      this.log(`Found authorization flow: ${result.data.results[0].pk}`);
      return result.data.results[0].pk;
    }

    // Try explicit consent
    result = await this.fetchJson<AuthentikPaginatedResponse<AuthentikFlow>>(
      `${baseUrl}/api/v3/flows/instances/?slug=default-provider-authorization-explicit-consent`,
      { auth }
    );

    if (result.data?.results?.[0]?.pk) {
      this.log(`Found authorization flow: ${result.data.results[0].pk}`);
      return result.data.results[0].pk;
    }

    throw new Error('No authorization flow found');
  }

  /**
   * Get the invalidation flow (required in Authentik 2024.12+)
   * Override in version-specific classes if needed
   */
  protected async getInvalidationFlow(
    baseUrl: string,
    auth: AuthContext
  ): Promise<string | null> {
    return null;
  }

  /**
   * Get OAuth2 scope mappings for profile, email, openid
   */
  protected async getScopeMappings(
    baseUrl: string,
    auth: AuthContext
  ): Promise<string[]> {
    this.log('Getting OAuth2 scope mappings...');

    const result = await this.fetchJson<AuthentikPaginatedResponse<AuthentikPropertyMapping>>(
      `${baseUrl}/api/v3/propertymappings/all/?page_size=100`,
      { auth }
    );

    if (!result.success || !result.data?.results) {
      this.warn('Could not fetch scope mappings');
      return [];
    }

    // Filter for OAuth scope mappings (openid, email, profile)
    const scopeMappings = result.data.results
      .filter((m) => m.name.match(/OAuth Mapping: OpenID .*(openid|email|profile)/))
      .map((m) => m.pk);

    if (scopeMappings.length === 0) {
      this.warn('Could not find scope mappings, using defaults');
    } else {
      this.log(`Found ${scopeMappings.length} scope mappings`);
    }

    return scopeMappings;
  }

  /**
   * Create the test application
   */
  protected async createApplication(
    options: ProviderInitOptions,
    auth: AuthContext,
    providerId: number
  ): Promise<void> {
    this.log('Creating application...');

    // Check if application exists
    const existingResult = await this.fetchJson<AuthentikPaginatedResponse<AuthentikApplication>>(
      `${options.baseUrl}/api/v3/core/applications/?slug=test-spa`,
      { auth }
    );

    if ((existingResult.data?.results?.length || 0) > 0) {
      this.warn('Application already exists');
      return;
    }

    // Create application
    const createResult = await this.fetchJson<AuthentikApplication>(
      `${options.baseUrl}/api/v3/core/applications/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test SPA',
          slug: 'test-spa',
          provider: providerId,
          policy_engine_mode: 'any',
        }),
        auth,
      }
    );

    if (!createResult.success || !createResult.data?.slug) {
      throw new Error(`Failed to create application: ${createResult.error}`);
    }

    this.log(`Created application: ${createResult.data.slug}`);
  }

  /**
   * Create test users
   */
  async createTestUsers(
    options: ProviderInitOptions,
    auth: AuthContext
  ): Promise<ApiResult<void>> {
    for (const user of options.testUsers) {
      this.log(`Creating test user: ${user.username}...`);

      // Check if user exists
      const existingResult = await this.fetchJson<AuthentikPaginatedResponse<AuthentikUser>>(
        `${options.baseUrl}/api/v3/core/users/?username=${user.username}`,
        { auth }
      );

      let userId: number;

      if ((existingResult.data?.results?.length || 0) > 0) {
        userId = existingResult.data!.results[0].pk;
        this.warn(`User ${user.username} already exists (pk: ${userId})`);
      } else {
        // Create user
        const createResult = await this.fetchJson<AuthentikUser>(
          `${options.baseUrl}/api/v3/core/users/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user.username,
              name: user.username,
              email: user.email,
              is_active: true,
              path: 'users',
            }),
            auth,
          }
        );

        if (!createResult.success || !createResult.data?.pk) {
          return {
            success: false,
            error: `Failed to create user ${user.username}: ${createResult.error}`,
          };
        }

        userId = createResult.data.pk;
        this.log(`Created test user (pk: ${userId})`);
      }

      // Set password
      this.log('Setting test user password...');
      const pwdResult = await this.fetchJson(
        `${options.baseUrl}/api/v3/core/users/${userId}/set_password/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: user.password }),
          auth,
        }
      );

      if (!pwdResult.success) {
        this.warn(`Password set may have failed: ${pwdResult.error}`);
      } else {
        this.log('Test user password set');
      }
    }

    return { success: true };
  }

  /**
   * Format redirect URIs for the API
   * Override in version-specific classes
   */
  protected abstract formatRedirectUris(
    uris: string[]
  ): string | Array<{ matching_mode: string; url: string }>;
}
