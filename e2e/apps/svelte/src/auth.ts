import { createAuthStore } from '@auth-code-pkce/svelte';
import { getAppConfig, buildProviderConfig } from '@auth-code-pkce/test-app-shared';

const config = getAppConfig();
const provider = buildProviderConfig(config);

export const auth = createAuthStore({
  provider,
});
