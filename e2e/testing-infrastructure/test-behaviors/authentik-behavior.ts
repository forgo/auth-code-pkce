/**
 * Authentik-specific test behavior
 *
 * Authentik characteristics:
 * - Multi-step login (username first, then password)
 * - May show consent screen after login
 * - Shows confirmation page after logout (requires clicking "log back in" link)
 * - Uses application slug-based URLs
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BaseProviderBehavior } from './base-behavior.js';
import type { ProviderTestConfig } from './types.js';

export class AuthentikBehavior extends BaseProviderBehavior {
  constructor(config: ProviderTestConfig) {
    super(config);
  }

  override get isMultiStepLogin(): boolean {
    return true;
  }

  getProviderType(): 'authentik' {
    return 'authentik';
  }

  getUrlParams(): Record<string, string> {
    return {
      slug: 'test-spa',
    };
  }

  /**
   * Authentik uses multi-step login: username first, then password
   */
  override async login(page: Page, username: string, password: string): Promise<void> {
    const { selectors } = this.config;

    // Step 1: Enter username
    await page.fill(selectors.usernameInput, username);
    await page.click(selectors.submitButton);

    // Step 2: Wait for password field and enter password
    const passwordInput = page.locator(selectors.passwordInput);
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Brief pause for UI stability

    // Clear and fill to ensure value is set
    await passwordInput.clear();
    await passwordInput.fill(password);

    // Wait for the value to be set before clicking submit
    await page.waitForTimeout(200);
    await page.locator(selectors.submitButton).click();
  }

  /**
   * Handle Authentik consent screen if it appears
   */
  override async handleConsentScreen(page: Page, appPort: number): Promise<void> {
    const { selectors } = this.config;

    try {
      await Promise.race([
        page.waitForURL(`http://localhost:${appPort}/**`, { timeout: 5000 }),
        page.waitForTimeout(3000).then(async () => {
          const submitBtn = page.locator(selectors.submitButton);
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
          }
        }),
      ]);
    } catch {
      // Timeout is OK - consent screen may not appear
    }
  }

  /**
   * Wait for login error - Authentik shows different error types:
   * - Alert messages for authentication failures
   * - Access denied icons for authorization failures
   * - Browser validation for empty fields
   */
  override async waitForLoginError(page: Page): Promise<Locator> {
    // Wait a moment for any error to appear
    await page.waitForTimeout(1000);

    // Check for Authentik error messages
    const errorSelectors = [
      '.pf-c-alert__title',
      '.pf-m-error',
      'ak-stage-access-denied-icon',
      // Also check for "Invalid password" or similar text
      'text=/invalid|incorrect|failed|denied/i',
    ];

    for (const selector of errorSelectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return locator;
      }
    }

    // Fall back to base implementation
    return super.waitForLoginError(page);
  }

  /**
   * Handle Authentik logout confirmation page
   *
   * Authentik shows a "You've logged out" page with a "log back in" link
   * instead of auto-redirecting to the post_logout_redirect_uri.
   * We navigate directly back to the app URL since clicking the link
   * takes users to Authentik's login page, not the app.
   */
  override async handleLogout(page: Page, logoutButton: Locator, appBaseUrl: string): Promise<void> {
    await logoutButton.click();

    // Check for either immediate redirect or Authentik's confirmation page
    try {
      // Fast path: already at logged-out state (auto-redirect worked)
      await expect(page.getByTestId('logged-out')).toBeVisible({ timeout: 3000 });
    } catch {
      // Slow path: Authentik shows confirmation page
      // Check if we're on Authentik's logout confirmation page
      const logBackInLink = page.getByRole('link', { name: /log back into/i });
      const isOnConfirmationPage = await logBackInLink.isVisible({ timeout: 2000 }).catch(() => false);

      if (isOnConfirmationPage) {
        // Navigate directly back to the app instead of clicking the Authentik link
        // (clicking the link goes to Authentik login, not the app)
        await page.goto(appBaseUrl);
      }

      // Now wait for the logged-out state
      await expect(page.getByTestId('logged-out')).toBeVisible({ timeout: 15000 });
    }
  }
}
