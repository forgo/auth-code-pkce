import type { App, Plugin } from "vue";
import type { JwtPayload } from "@auth-code-pkce/core";
import {
  AUTH_KEY,
  createAuth,
  type AuthComposable,
  type CreateAuthConfig,
} from "./composables/useAuth.js";

/**
 * Create Vue plugin for auth
 *
 * @example
 * ```ts
 * import { createApp } from 'vue';
 * import { createAuthPlugin } from '@auth-code-pkce/vue';
 * import { okta } from '@auth-code-pkce/core/providers';
 *
 * const app = createApp(App);
 *
 * app.use(createAuthPlugin({
 *   provider: okta({
 *     issuer: 'https://dev-123456.okta.com',
 *     clientId: 'your-client-id',
 *     redirectUri: 'https://yourapp.com/callback',
 *   }),
 * }));
 *
 * app.mount('#app');
 * ```
 */
export function createAuthPlugin<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(config: CreateAuthConfig<TJwt, TUser>): Plugin {
  return {
    install(app: App) {
      const auth = createAuth<TJwt, TUser>(config);
      app.provide(AUTH_KEY, auth);

      // Make available on globalProperties for Options API
      app.config.globalProperties.$auth = auth;
    },
  };
}

// Augment Vue types for globalProperties
declare module "vue" {
  interface ComponentCustomProperties {
    $auth: AuthComposable<JwtPayload, unknown>;
  }
}
