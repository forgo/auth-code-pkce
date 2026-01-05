import type { ProviderTestConfig } from '../types.js';

const KEYCLOAK_URL = process.env.KEYCLOAK_V26_URL || 'http://localhost:8026';

export const keycloakV26Config: ProviderTestConfig = {
  name: 'Keycloak',
  version: '26.0.7',
  baseUrl: KEYCLOAK_URL,
  healthEndpoint: `${KEYCLOAK_URL}/health/ready`,

  selectors: {
    usernameInput: '#username',
    passwordInput: '#password',
    submitButton: '#kc-login',
    // Keycloak v26 uses PatternFly helper-text for inline validation errors
    errorMessage: '.pf-v5-c-helper-text, .pf-c-helper-text, .alert-error, #input-error',
  },

  testUser: {
    username: 'testuser',
    password: 'testpassword',
    email: 'testuser@example.com',
  },
};
