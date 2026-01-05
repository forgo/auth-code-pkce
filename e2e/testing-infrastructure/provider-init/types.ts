/**
 * Provider initialization types
 *
 * These interfaces define the contract for initializing OAuth providers
 * for E2E testing. Each provider version implements these interfaces
 * to handle version-specific API differences.
 */

/**
 * Result of a provider API call
 */
export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Authentication context for provider API calls
 */
export interface AuthContext {
  /** Session cookies */
  cookies: Record<string, string>;
  /** CSRF token for POST/PUT/DELETE */
  csrfToken?: string;
  /** Bearer token if applicable */
  accessToken?: string;
}

/**
 * OAuth client configuration to be created
 */
export interface OAuthClientConfig {
  /** Client ID */
  clientId: string;
  /** Client type */
  clientType: 'public' | 'confidential';
  /** Allowed redirect URIs */
  redirectUris: string[];
  /** Requested scopes */
  scopes: string[];
  /** Additional provider-specific settings */
  extra?: Record<string, unknown>;
}

/**
 * Test user configuration
 */
export interface TestUserConfig {
  /** Username for login */
  username: string;
  /** Password for login */
  password: string;
  /** Email address */
  email: string;
  /** Group memberships */
  groups?: string[];
}

/**
 * Provider initialization options
 */
export interface ProviderInitOptions {
  /** Base URL of the provider (e.g., http://localhost:9024) */
  baseUrl: string;
  /** Docker container name for CLI operations */
  containerName: string;
  /** OAuth client to create */
  client: OAuthClientConfig;
  /** Test users to create */
  testUsers: TestUserConfig[];
  /** Wait timeout in ms (default: 120000) */
  timeout?: number;
}

/**
 * Core interface that all provider initializers must implement
 */
export interface ProviderInitializer {
  /** Provider name for logging */
  readonly name: string;
  /** Provider version */
  readonly version: string;

  /**
   * Wait for the provider to be healthy and ready
   */
  waitForReady(options: ProviderInitOptions): Promise<void>;

  /**
   * Authenticate to get admin access for API calls
   */
  authenticate(options: ProviderInitOptions): Promise<AuthContext>;

  /**
   * Create or update OAuth client/application
   */
  createOAuthClient(
    options: ProviderInitOptions,
    auth: AuthContext
  ): Promise<ApiResult<{ clientId: string; providerId?: string }>>;

  /**
   * Create test user(s)
   */
  createTestUsers(
    options: ProviderInitOptions,
    auth: AuthContext
  ): Promise<ApiResult<void>>;

  /**
   * Full initialization workflow
   */
  initialize(options: ProviderInitOptions): Promise<void>;
}

/**
 * Default redirect URIs for test applications
 */
export const DEFAULT_REDIRECT_URIS = [
  'http://localhost:3000/callback',
  'http://localhost:5173/callback',
  'http://localhost:4173/callback',
  'http://localhost:3010/callback',
  'http://localhost:3011/callback',
  'http://localhost:3012/callback',
];

/**
 * Default test user
 */
export const DEFAULT_TEST_USER: TestUserConfig = {
  username: 'testuser',
  password: 'testpassword123',
  email: 'testuser@example.com',
};
