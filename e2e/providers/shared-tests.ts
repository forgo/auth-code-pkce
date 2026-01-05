import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { type ProviderConfig, buildAuthorizationUrl, PKCE_TEST_PAIRS } from './types.js';

/**
 * Login via the provider's login page
 * Handles both single-step and multi-step login flows
 */
export async function loginViaProvider(
  page: Page,
  config: ProviderConfig,
  username: string,
  password: string
): Promise<void> {
  if (config.multiStepLogin) {
    // Multi-step flow: username first, then password
    await page.fill(config.selectors.usernameInput, username);
    await page.click(config.selectors.submitButton);

    // Wait for password field to appear and be ready for input
    const passwordInput = page.locator(config.selectors.passwordInput);
    await passwordInput.waitFor({ state: 'visible' });
    // Small delay for any animations to complete
    await page.waitForTimeout(500);
    await passwordInput.fill(password);

    // Click the submit button that's currently visible
    await page.locator(config.selectors.submitButton).click();

    // Handle consent screen if it appears (e.g., for new scopes in Authentik)
    // Wait for either redirect to callback or consent button to appear
    try {
      await Promise.race([
        page.waitForURL(/.*\/callback\?/, { timeout: 3000 }),
        page.waitForTimeout(2000).then(async () => {
          // If still on the provider page, check for consent button
          const submitBtn = page.locator(config.selectors.submitButton);
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
          }
        }),
      ]);
    } catch {
      // Timeout is OK - we'll handle the redirect in the test
    }
  } else {
    // Single-step flow: username and password on same page
    await page.fill(config.selectors.usernameInput, username);
    await page.fill(config.selectors.passwordInput, password);
    await page.click(config.selectors.submitButton);
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  request: APIRequestContext,
  config: ProviderConfig,
  code: string,
  codeVerifier: string
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await request.post(config.endpoints.token, {
    form: {
      grant_type: 'authorization_code',
      client_id: config.client.clientId,
      redirect_uri: config.client.redirectUri,
      code,
      code_verifier: codeVerifier,
    },
  });

  return {
    ok: response.ok(),
    status: response.status(),
    data: await response.json().catch(() => null),
  };
}

/**
 * Refresh access token
 */
export async function refreshTokens(
  request: APIRequestContext,
  config: ProviderConfig,
  refreshToken: string
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await request.post(config.endpoints.token, {
    form: {
      grant_type: 'refresh_token',
      client_id: config.client.clientId,
      refresh_token: refreshToken,
    },
  });

  return {
    ok: response.ok(),
    status: response.status(),
    data: await response.json().catch(() => null),
  };
}

/**
 * Get user info
 */
export async function getUserInfo(
  request: APIRequestContext,
  config: ProviderConfig,
  accessToken: string
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await request.get(config.endpoints.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return {
    ok: response.ok(),
    status: response.status(),
    data: await response.json().catch(() => null),
  };
}

/**
 * Create standard OAuth E2E tests for any provider
 */
export function createProviderTests(config: ProviderConfig) {
  const { verifier, challenge } = PKCE_TEST_PAIRS.pair1;

  test.describe(`${config.name} E2E Tests`, () => {
    test.beforeEach(async ({ page, context }) => {
      // Clear cookies to ensure clean session for each test
      await context.clearCookies();

      // Check if provider is ready (if health endpoint is configured)
      if (config.endpoints.health) {
        const response = await page.request.get(config.endpoints.health);
        expect(response.ok()).toBe(true);
      }
    });

    test('should redirect to login page', async ({ page }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);

      // Should see login form (username field and submit button always visible on first step)
      await expect(page.locator(config.selectors.usernameInput)).toBeVisible();
      await expect(page.locator(config.selectors.submitButton)).toBeVisible();

      // Password field may be on same page or second step
      if (!config.multiStepLogin) {
        await expect(page.locator(config.selectors.passwordInput)).toBeVisible();
      }
    });

    test('should complete login and redirect with code', async ({ page }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);
      await loginViaProvider(page, config, config.testUser.username, config.testUser.password);

      // Should redirect to callback URL with code and state
      await page.waitForURL(/.*\/callback\?/);
      const url = new URL(page.url());
      expect(url.searchParams.get('code')).toBeTruthy();
      expect(url.searchParams.get('state')).toBe(state);
    });

    test('should reject invalid credentials', async ({ page }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);
      await loginViaProvider(page, config, 'wronguser', 'wrongpassword');

      // Should show error message
      await expect(page.locator(config.selectors.errorMessage)).toBeVisible({ timeout: 5000 });
      // Should still be on provider (not redirected to callback)
      expect(page.url()).not.toContain('/callback');
    });

    test('should exchange code for tokens', async ({ page, request }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);
      await loginViaProvider(page, config, config.testUser.username, config.testUser.password);

      await page.waitForURL(/.*\/callback\?/);
      const url = new URL(page.url());
      const code = url.searchParams.get('code')!;

      const result = await exchangeCodeForTokens(request, config, code, verifier);

      expect(result.ok).toBe(true);
      expect(result.data.access_token).toBeTruthy();
      expect(result.data.id_token).toBeTruthy();
      expect(result.data.token_type).toBe('Bearer');
    });

    test('should reject wrong PKCE verifier', async ({ page, request }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);
      await loginViaProvider(page, config, config.testUser.username, config.testUser.password);

      await page.waitForURL(/.*\/callback\?/);
      const url = new URL(page.url());
      const code = url.searchParams.get('code')!;

      const result = await exchangeCodeForTokens(request, config, code, 'wrong-verifier');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
    });

    test('should refresh tokens', async ({ page, request }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);
      await loginViaProvider(page, config, config.testUser.username, config.testUser.password);

      await page.waitForURL(/.*\/callback\?/);
      const url = new URL(page.url());
      const code = url.searchParams.get('code')!;

      // Get initial tokens
      const tokenResult = await exchangeCodeForTokens(request, config, code, verifier);
      expect(tokenResult.ok).toBe(true);
      expect(tokenResult.data.refresh_token).toBeTruthy();

      // Refresh
      const refreshResult = await refreshTokens(request, config, tokenResult.data.refresh_token);
      expect(refreshResult.ok).toBe(true);
      expect(refreshResult.data.access_token).toBeTruthy();
      expect(refreshResult.data.access_token).not.toBe(tokenResult.data.access_token);
    });

    test('should return user info', async ({ page, request }) => {
      const state = `test-state-${Date.now()}`;
      const authUrl = buildAuthorizationUrl(config, state, challenge);

      await page.goto(authUrl);
      await loginViaProvider(page, config, config.testUser.username, config.testUser.password);

      await page.waitForURL(/.*\/callback\?/);
      const url = new URL(page.url());
      const code = url.searchParams.get('code')!;

      const tokenResult = await exchangeCodeForTokens(request, config, code, verifier);
      expect(tokenResult.ok).toBe(true);

      const userInfoResult = await getUserInfo(request, config, tokenResult.data.access_token);
      expect(userInfoResult.ok).toBe(true);
      expect(userInfoResult.data.sub).toBeTruthy();
      expect(userInfoResult.data.email).toBe(config.testUser.email);
    });
  });
}
