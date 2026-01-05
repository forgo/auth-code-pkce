/**
 * Base provider behavior with default implementations
 *
 * Provides sensible defaults that can be overridden by
 * provider-specific implementations.
 */

import type { Page, Locator } from '@playwright/test';
import type { ProviderBehavior, ProviderTestConfig } from './types.js';

export abstract class BaseProviderBehavior implements ProviderBehavior {
  constructor(public readonly config: ProviderTestConfig) {}

  get isMultiStepLogin(): boolean {
    return this.config.multiStepLogin ?? false;
  }

  /**
   * Default single-step login implementation
   */
  async login(page: Page, username: string, password: string): Promise<void> {
    const { selectors } = this.config;

    await page.fill(selectors.usernameInput, username);
    await page.fill(selectors.passwordInput, password);
    await page.click(selectors.submitButton);
  }

  /**
   * Default consent handling - no-op, override if needed
   */
  async handleConsentScreen(_page: Page, _appPort: number): Promise<void> {
    // Default: no consent screen handling needed
  }

  /**
   * Default logout - just click and wait for logged-out state
   */
  async handleLogout(page: Page, logoutButton: Locator, _appBaseUrl: string): Promise<void> {
    await logoutButton.click();
    // Default: expect auto-redirect back to app
  }

  /**
   * Default error detection
   */
  async waitForLoginError(page: Page): Promise<Locator> {
    const errorLocator = page.locator(this.config.selectors.errorMessage);
    await errorLocator.waitFor({ state: 'visible', timeout: 5000 });
    return errorLocator;
  }

  /**
   * Abstract - must be implemented by subclasses
   */
  abstract getProviderType(): 'keycloak' | 'authentik';

  /**
   * Abstract - must be implemented by subclasses
   */
  abstract getUrlParams(): Record<string, string>;
}
