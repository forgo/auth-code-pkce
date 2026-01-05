import type { ProviderConfig } from '../../types.js';

const AUTHENTIK_URL = process.env.AUTHENTIK_V2024_12_URL || 'http://localhost:9025';
const APP_SLUG = process.env.AUTHENTIK_APP_SLUG || 'test-spa';

export const authentikConfig: ProviderConfig = {
  name: 'Authentik',
  version: '2024.12.2',
  imageTag: 'ghcr.io/goauthentik/server:2024.12.2',
  baseUrl: AUTHENTIK_URL,

  endpoints: {
    authorization: `${AUTHENTIK_URL}/application/o/authorize/`,
    token: `${AUTHENTIK_URL}/application/o/token/`,
    userinfo: `${AUTHENTIK_URL}/application/o/userinfo/`,
    logout: `${AUTHENTIK_URL}/application/o/${APP_SLUG}/end-session/`,
    health: `${AUTHENTIK_URL}/-/health/ready/`,
  },

  client: {
    clientId: 'test-spa',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  },

  testUser: {
    username: 'testuser',
    password: 'testpassword123',
    email: 'testuser@example.com',
  },

  selectors: {
    usernameInput: 'input[name="uidField"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '.pf-c-alert__title, .pf-m-error, ak-stage-access-denied-icon',
  },

  // Authentik uses a two-step login: username first, then password
  multiStepLogin: true,
};
