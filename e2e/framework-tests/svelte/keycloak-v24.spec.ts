import { createFrameworkTests } from '../shared-tests.js';
import { keycloakV24Config } from '../configs/index.js';
import { APP_PORTS } from '../types.js';

createFrameworkTests({
  framework: 'svelte',
  appPort: APP_PORTS.svelte,
  provider: keycloakV24Config,
});
