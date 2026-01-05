/**
 * Keycloak-specific test behavior
 *
 * Keycloak characteristics:
 * - Single-step login (username + password on same page)
 * - Auto-redirects after logout (no confirmation page)
 * - Uses realm-based URLs
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BaseProviderBehavior } from './base-behavior.js';
import type { ProviderTestConfig } from './types.js';

export class KeycloakBehavior extends BaseProviderBehavior {
  constructor(config: ProviderTestConfig) {
    super(config);
  }

  getProviderType(): 'keycloak' {
    return 'keycloak';
  }

  getUrlParams(): Record<string, string> {
    return {
      realm: 'test-realm',
    };
  }

  /**
   * Keycloak uses single-step login
   */
  override async login(page: Page, username: string, password: string): Promise<void> {
    const { selectors } = this.config;

    await page.fill(selectors.usernameInput, username);
    await page.fill(selectors.passwordInput, password);
    await page.click(selectors.submitButton);
  }

  /**
   * Keycloak auto-redirects after logout
   */
  override async handleLogout(page: Page, logoutButton: Locator, _appBaseUrl: string): Promise<void> {
    await logoutButton.click();
    // Keycloak auto-redirects, just wait for logged-out state
    await expect(page.getByTestId('logged-out')).toBeVisible({ timeout: 15000 });
  }
}
