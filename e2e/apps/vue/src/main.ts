import { createApp } from 'vue';
import { createAuthPlugin } from '@auth-code-pkce/vue';
import App from './App.vue';
import { getAppConfig, buildProviderConfig } from '@auth-code-pkce/test-app-shared';

const config = getAppConfig();
const provider = buildProviderConfig(config);

const app = createApp(App);

app.use(
  createAuthPlugin({
    provider,
  })
);

app.mount('#app');
