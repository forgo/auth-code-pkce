import { createProviderTests } from '../../shared-tests.js';
import { authentikConfig } from './config.js';

// Run standard OAuth E2E tests for Authentik v2025.6
createProviderTests(authentikConfig);
