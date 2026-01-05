import type { ProviderTestConfig } from '../types.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_V25_URL || 'http://localhost:8025';

export const keycloakV25Config: ProviderTestConfig = {
  name: 'Keycloak',
  version: '25.0.6',
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
