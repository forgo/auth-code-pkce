import type { ProviderConfig } from '../../types.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_V24_URL || 'http://localhost:8024';
const REALM = process.env.KEYCLOAK_REALM || 'test-realm';

export const keycloakConfig: ProviderConfig = {
  name: 'Keycloak',
  version: '24.0.5',
  imageTag: 'quay.io/keycloak/keycloak:24.0.5',
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
