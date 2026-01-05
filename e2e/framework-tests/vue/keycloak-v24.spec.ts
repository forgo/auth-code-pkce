import { createFrameworkTests } from '../shared-tests.js';
import { keycloakV24Config } from '../configs/index.js';
import { APP_PORTS } from '../types.js';

createFrameworkTests({
  framework: 'vue',
  appPort: APP_PORTS.vue,
  provider: keycloakV24Config,
});
