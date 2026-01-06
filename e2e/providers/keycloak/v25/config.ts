import type { ProviderConfig } from '../../types.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_V25_URL || 'http://localhost:8025';
const REALM = process.env.KEYCLOAK_REALM || 'test-realm';

export const keycloakConfig: ProviderConfig = {
  name: 'Keycloak',
  version: '25.0.6',
  imageTag: 'quay.io/keycloak/keycloak:25.0.6',
  baseUrl: KEYCLOAK_URL,

  endpoints: {
    authorization: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`,
    token: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    userinfo: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`,
    logout: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
    // Health endpoint is on management port 9000, not exposed
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
    errorMessage: '.alert-error, #input-error',
  },
};
