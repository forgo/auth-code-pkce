import { test, expect } from '@playwright/test';
import type { FrameworkTestConfig } from './types.js';
import {
  createBehavior,
  buildAppUrl,
  type ProviderBehavior,
} from '../testing-infrastructure/test-behaviors/index.js';

/**
 * Create framework E2E tests
 *
 * Uses provider behaviors to handle provider-specific logic,
 * keeping this shared test code completely provider-agnostic.
 */
export function createFrameworkTests(config: FrameworkTestConfig) {
  // Create the behavior for this provider
  const behavior: ProviderBehavior = createBehavior(config.provider);

  // Build URLs
  const appUrl = buildAppUrl(behavior, config.appPort);
  const baseAppUrl = `http://localhost:${config.appPort}`;

  test.describe(`${config.framework} + ${config.provider.name} ${config.provider.version}`, () => {
    test.beforeEach(async ({ context, page }) => {
      // Clear cookies/storage to ensure clean session
      await context.clearCookies();

      // Clear localStorage to reset provider config
      await page.goto(baseAppUrl);
      await page.evaluate(() => {
        localStorage.clear();
      });
    });

    test('should show login button when not authenticated', async ({ page }) => {
      await page.goto(appUrl);

      // Wait for loading to complete
      await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });

      // Should show logged out state
      await expect(page.getByTestId('logged-out')).toBeVisible();
      await expect(page.getByTestId('login-btn')).toBeVisible();
    });

    test('should complete full login flow', async ({ page }) => {
      // Intercept token requests and proxy via Playwright's request API
      // This bypasses browser CORS restrictions in the E2E test environment
      await page.route('**/protocol/openid-connect/token', async (route) => {
        const request = route.request();
        const response = await page.request.post(request.url(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: request.postData() || '',
        });
        await route.fulfill({
          status: response.status(),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: await response.body(),
        });
      });

      await page.goto(appUrl);
      await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });

      // Click login - redirects to provider
      await page.getByTestId('login-btn').click();

      // Wait for provider login page
      await expect(page.locator(behavior.config.selectors.usernameInput)).toBeVisible({
        timeout: 10000,
      });

      // Login via provider using behavior
      await behavior.login(
        page,
        behavior.config.testUser.username,
        behavior.config.testUser.password
      );

      // Handle consent screen if needed (provider-specific)
      await behavior.handleConsentScreen(page, config.appPort);

      // Should redirect back to app and show authenticated state
      await expect(page.getByTestId('logged-in')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('user-sub')).toBeVisible();
      await expect(page.getByTestId('user-email')).toContainText(behavior.config.testUser.email);
    });

    test('should persist auth state on page reload', async ({ page }) => {
      // Complete login first
      await page.goto(appUrl);
      await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });
      await page.getByTestId('login-btn').click();
      await expect(page.locator(behavior.config.selectors.usernameInput)).toBeVisible({
        timeout: 10000,
      });
      await behavior.login(
        page,
        behavior.config.testUser.username,
        behavior.config.testUser.password
      );
      await behavior.handleConsentScreen(page, config.appPort);
      await expect(page.getByTestId('logged-in')).toBeVisible({ timeout: 15000 });

      // Reload page
      await page.reload();

      // Should still be authenticated (tokens restored from storage)
      await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('logged-in')).toBeVisible();
      await expect(page.getByTestId('user-email')).toContainText(behavior.config.testUser.email);
    });

    test('should complete logout flow', async ({ page }) => {
      // Login first
      await page.goto(appUrl);
      await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });
      await page.getByTestId('login-btn').click();
      await expect(page.locator(behavior.config.selectors.usernameInput)).toBeVisible({
        timeout: 10000,
      });
      await behavior.login(
        page,
        behavior.config.testUser.username,
        behavior.config.testUser.password
      );
      await behavior.handleConsentScreen(page, config.appPort);
      await expect(page.getByTestId('logged-in')).toBeVisible({ timeout: 15000 });

      // Logout using provider behavior (handles confirmation pages, etc.)
      const logoutButton = page.getByTestId('logout-btn');
      await behavior.handleLogout(page, logoutButton, baseAppUrl);
    });

    test('should handle invalid credentials at provider', async ({ page }) => {
      await page.goto(appUrl);
      await expect(page.getByTestId('loading')).not.toBeVisible({ timeout: 10000 });

      // Click login
      await page.getByTestId('login-btn').click();
      await expect(page.locator(behavior.config.selectors.usernameInput)).toBeVisible({
        timeout: 10000,
      });

      // Enter invalid credentials at provider
      await behavior.login(page, 'wronguser@example.com', 'wrongpassword');

      // Should show provider error (still on provider page) using behavior
      await behavior.waitForLoginError(page);

      // Should NOT be redirected to app
      expect(page.url()).not.toContain(`localhost:${config.appPort}`);
    });
  });
}
