import { createFrameworkTests } from '../shared-tests.js';
import { authentikV2025_6Config } from '../configs/index.js';
import { APP_PORTS } from '../types.js';

createFrameworkTests({
  framework: 'svelte',
  appPort: APP_PORTS.svelte,
  provider: authentikV2025_6Config,
});
