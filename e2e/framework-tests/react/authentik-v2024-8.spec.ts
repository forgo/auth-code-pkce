import { createFrameworkTests } from '../shared-tests.js';
import { authentikV2024_8Config } from '../configs/index.js';
import { APP_PORTS } from '../types.js';

createFrameworkTests({
  framework: 'react',
  appPort: APP_PORTS.react,
  provider: authentikV2024_8Config,
});
