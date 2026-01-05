import { createFrameworkTests } from '../shared-tests.js';
import { authentikV2024_12Config } from '../configs/index.js';
import { APP_PORTS } from '../types.js';

createFrameworkTests({
  framework: 'vue',
  appPort: APP_PORTS.vue,
  provider: authentikV2024_12Config,
});
