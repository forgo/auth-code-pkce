import type { ProviderConfig } from '../../types.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_V26_URL || 'http://localhost:8026';
const REALM = process.env.KEYCLOAK_REALM || 'test-realm';

export const keycloakConfig: ProviderConfig = {
  name: 'Keycloak',
  version: '26.0.7',
  imageTag: 'quay.io/keycloak/keycloak:26.0.7',
  baseUrl: KEYCLOAK_URL,

  endpoints: {
    authorization: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`,
    token: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    userinfo: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
    logout: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
    // Health endpoint is on management port 9000, not exposed
    // health: `${KEYCLOAK_URL}/health/ready`,
  },

  client: {
    clientId: 'test-spa',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['openid', 'profile', 'email'],
  },

  testUser: {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  },

  selectors: {
    usernameInput: '#username',
    passwordInput: '#password',
    submitButton: '#kc-login',
    // Keycloak v26 uses inline error messages below the input field
    errorMessage: '[class*="helper-text"], .alert-error, #input-error',
  },
};
