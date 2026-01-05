import { createProviderTests } from '../../shared-tests.js';
import { keycloakConfig } from './config.js';

// Run standard OAuth E2E tests for Keycloak v26
createProviderTests(keycloakConfig);
