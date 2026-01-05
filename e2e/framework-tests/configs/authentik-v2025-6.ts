import type { ProviderTestConfig } from '../types.js';

const AUTHENTIK_URL = process.env.AUTHENTIK_V2025_6_URL || 'http://localhost:9026';

export const authentikV2025_6Config: ProviderTestConfig = {
  name: 'Authentik',
  version: '2025.6.1',
  baseUrl: AUTHENTIK_URL,
  healthEndpoint: `${AUTHENTIK_URL}/-/health/ready/`,

  selectors: {
    usernameInput: 'input[name="uidField"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '.pf-c-alert__title, .pf-m-error, ak-stage-access-denied-icon',
  },

  multiStepLogin: true,

  testUser: {
    username: 'testuser',
    password: 'testpassword123',
    email: 'testuser@example.com',
  },
};
