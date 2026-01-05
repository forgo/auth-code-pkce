import type { ProviderTestConfig } from '../types.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_V24_URL || 'http://localhost:8024';

export const keycloakV24Config: ProviderTestConfig = {
  name: 'Keycloak',
  version: '24.0.5',
  baseUrl: KEYCLOAK_URL,
  healthEndpoint: `${KEYCLOAK_URL}/health/ready`,

  selectors: {
    usernameInput: '#username',
    passwordInput: '#password',
    submitButton: '#kc-login',
    errorMessage: '.alert-error, #input-error',
  },

  testUser: {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  },
};
