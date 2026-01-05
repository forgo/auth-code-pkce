/**
 * Provider behavior types for E2E tests
 *
 * Defines the interface for provider-specific test behaviors,
 * allowing shared tests to remain provider-agnostic.
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Provider configuration for tests (same as framework-tests/types.ts)
 */
export interface ProviderTestConfig {
  name: string;
  version: string;
  baseUrl: string;
  healthEndpoint?: string;
  selectors: {
    usernameInput: string;
    passwordInput: string;
    submitButton: string;
    errorMessage: string;
  };
  multiStepLogin?: boolean;
  testUser: {
    username: string;
    password: string;
    email: string;
  };
}

/**
 * Provider-specific behavior interface
 *
 * Encapsulates all provider-specific test logic so shared tests
 * can remain completely provider-agnostic.
 */
export interface ProviderBehavior {
  /** Provider configuration */
  readonly config: ProviderTestConfig;

  /** Whether this provider uses multi-step login */
  readonly isMultiStepLogin: boolean;

  /**
   * Perform login via the provider's login page
   */
  login(page: Page, username: string, password: string): Promise<void>;

  /**
   * Handle consent screen if it appears after login
   * @param page - The Playwright page
   * @param appPort - The app port to check for redirect
   */
  handleConsentScreen(page: Page, appPort: number): Promise<void>;

  /**
   * Handle logout flow including any confirmation pages
   * @param page - The Playwright page
   * @param logoutButton - The logout button locator in the app
   * @param appBaseUrl - The app's base URL to navigate back to after logout
   */
  handleLogout(page: Page, logoutButton: Locator, appBaseUrl: string): Promise<void>;

  /**
   * Wait for and return the login error locator
   */
  waitForLoginError(page: Page): Promise<Locator>;

  /**
   * Get the OAuth provider type identifier
   */
  getProviderType(): 'keycloak' | 'authentik';

  /**
   * Get additional URL params needed for the provider
   */
  getUrlParams(): Record<string, string>;
}
