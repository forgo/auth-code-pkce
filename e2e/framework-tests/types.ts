/**
 * Framework test configuration
 */
export interface FrameworkTestConfig {
  /** Framework being tested (react, vue, svelte) */
  framework: 'react' | 'vue' | 'svelte';

  /** Port the test app runs on */
  appPort: number;

  /** Provider configuration */
  provider: ProviderTestConfig;
}

/**
 * Provider configuration for framework tests
 */
export interface ProviderTestConfig {
  /** Provider name (keycloak, authentik) */
  name: string;

  /** Provider version */
  version: string;

  /** Provider base URL */
  baseUrl: string;

  /** Health check endpoint */
  healthEndpoint?: string;

  /** Login page selectors */
  selectors: {
    usernameInput: string;
    passwordInput: string;
    submitButton: string;
    errorMessage: string;
  };

  /** Whether the provider uses a multi-step login flow */
  multiStepLogin?: boolean;

  /** Test user credentials */
  testUser: {
    username: string;
    password: string;
    email: string;
  };
}

/**
 * App ports for each framework
 */
export const APP_PORTS = {
  react: 3010,
  vue: 3011,
  svelte: 3012,
} as const;
