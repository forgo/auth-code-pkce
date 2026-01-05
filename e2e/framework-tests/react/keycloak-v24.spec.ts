import { createFrameworkTests } from '../shared-tests.js';
import { keycloakV24Config } from '../configs/index.js';
import { APP_PORTS } from '../types.js';

createFrameworkTests({
  framework: 'react',
  appPort: APP_PORTS.react,
  provider: keycloakV24Config,
});
