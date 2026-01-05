# auth-code-pkce

Framework-agnostic OAuth 2.0 Authorization Code + PKCE library with adapters for React, Vue, and Svelte.

## Features

- **Framework-agnostic core** - Use with any JavaScript framework or vanilla JS
- **Type-safe** - Full TypeScript support with generics for JWT and User types
- **Provider presets** - Pre-configured settings for Okta, Auth0, Keycloak, and Authentik
- **Secure by default** - PKCE with S256, proper state validation, sessionStorage for tokens
- **Pluggable storage** - Use sessionStorage, localStorage, memory, or custom adapters
- **HTTP client agnostic** - Bring your own HTTP client (defaults to fetch)

## Packages

| Package | Description |
|---------|-------------|
| `@auth-code-pkce/core` | Core OAuth/PKCE logic (framework-agnostic) |
| `@auth-code-pkce/react` | React Context + hooks |
| `@auth-code-pkce/vue` | Vue composables + plugin |
| `@auth-code-pkce/svelte` | Svelte stores |

## Installation

```bash
# Core only
pnpm add @auth-code-pkce/core

# With React
pnpm add @auth-code-pkce/core @auth-code-pkce/react

# With Vue
pnpm add @auth-code-pkce/core @auth-code-pkce/vue

# With Svelte
pnpm add @auth-code-pkce/core @auth-code-pkce/svelte
```

## Quick Start

### React

```tsx
import { AuthProvider, useAuth } from '@auth-code-pkce/react';
import { okta } from '@auth-code-pkce/core/providers';

const provider = okta({
  issuer: 'https://dev-123456.okta.com',
  clientId: 'your-client-id',
  redirectUri: `${window.location.origin}/callback`,
});

function App() {
  return (
    <AuthProvider provider={provider}>
      <YourApp />
    </AuthProvider>
  );
}

function Profile() {
  const { isAuthenticated, user, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => login()}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

### Vue

```ts
// main.ts
import { createApp } from 'vue';
import { createAuthPlugin } from '@auth-code-pkce/vue';
import { auth0 } from '@auth-code-pkce/core/providers';

const app = createApp(App);

app.use(createAuthPlugin({
  provider: auth0({
    issuer: 'https://your-tenant.auth0.com',
    clientId: 'your-client-id',
    redirectUri: `${window.location.origin}/callback`,
  }),
}));

app.mount('#app');
```

```vue
<!-- Profile.vue -->
<script setup>
import { useAuth } from '@auth-code-pkce/vue';

const { isAuthenticated, user, login, logout } = useAuth();
</script>

<template>
  <div v-if="isAuthenticated">
    <p>Welcome, {{ user?.name }}</p>
    <button @click="logout()">Logout</button>
  </div>
  <button v-else @click="login()">Login</button>
</template>
```

### Svelte

```ts
// stores/auth.ts
import { createAuthStore } from '@auth-code-pkce/svelte';
import { keycloak } from '@auth-code-pkce/core/providers';

export const auth = createAuthStore({
  provider: keycloak({
    issuer: 'https://keycloak.example.com/realms/myrealm',
    clientId: 'your-client-id',
    redirectUri: `${window.location.origin}/callback`,
  }),
});
```

```svelte
<!-- Profile.svelte -->
<script>
  import { auth } from './stores/auth';
</script>

{#if $auth.isAuthenticated}
  <p>Welcome, {$auth.user?.name}</p>
  <button on:click={() => auth.logout()}>Logout</button>
{:else}
  <button on:click={() => auth.login()}>Login</button>
{/if}
```

### Core (Vanilla JS)

```ts
import { createOAuthClient, okta } from '@auth-code-pkce/core';

const client = createOAuthClient({
  provider: okta({
    issuer: 'https://dev-123456.okta.com',
    clientId: 'your-client-id',
    redirectUri: `${window.location.origin}/callback`,
  }),
});

// Initialize (handles callback automatically)
await client.initialize();

// Check auth state
const state = client.getState();
if (state.isAuthenticated) {
  console.log('Logged in as:', state.jwt?.sub);
}

// Login
client.authorize();

// Get access token (refreshes if needed)
const token = await client.getAccessToken();

// Logout
client.logout();
```

## Provider Presets

```ts
import { okta, auth0, keycloak, authentik, generic } from '@auth-code-pkce/core/providers';

// Okta
const oktaConfig = okta({
  issuer: 'https://dev-123456.okta.com',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
});

// Auth0
const auth0Config = auth0({
  issuer: 'https://your-tenant.auth0.com',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
});

// Keycloak
const keycloakConfig = keycloak({
  issuer: 'https://keycloak.example.com/realms/myrealm',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
});

// Authentik
const authentikConfig = authentik({
  issuer: 'https://authentik.example.com/application/o/myapp',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
});

// Custom / Generic
const customConfig = generic({
  issuer: 'https://my-oauth-server.com',
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
  scopes: ['openid', 'profile'],
  endpoints: {
    authorizationEndpoint: 'https://my-oauth-server.com/auth',
    tokenEndpoint: 'https://my-oauth-server.com/token',
    logoutEndpoint: 'https://my-oauth-server.com/logout',
  },
});
```

## Custom User Fetching

```ts
interface MyJwt {
  sub: string;
  email: string;
  groups: string[];
}

interface MyUser {
  id: string;
  name: string;
  avatar: string;
}

const client = createOAuthClient<MyJwt, MyUser>({
  provider: okta({ ... }),
  getUser: async ({ accessToken, jwt, httpClient }) => {
    const response = await httpClient.request<MyUser>({
      url: '/api/users/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },
});
```

## Custom Storage

```ts
import { createOAuthClient, type StorageAdapter } from '@auth-code-pkce/core';

// Custom encrypted storage
const encryptedStorage: StorageAdapter = {
  get: (key) => decrypt(localStorage.getItem(key)),
  set: (key, value) => localStorage.setItem(key, encrypt(value)),
  remove: (key) => localStorage.removeItem(key),
  clear: () => { /* clear all auth keys */ },
};

const client = createOAuthClient({
  provider: okta({ ... }),
  storage: {
    tokenStorage: encryptedStorage,
    flowStorage: encryptedStorage,
  },
});
```

## Security

This library implements OAuth 2.0 Authorization Code with PKCE (RFC 7636) with the following security measures:

- **PKCE S256** - Always uses SHA-256 challenge method
- **Random state** - Cryptographically random state parameter with constant-time validation
- **SessionStorage** - Tokens stored in sessionStorage by default (cleared on tab close)
- **Automatic refresh** - Token refresh with request queueing (prevents thundering herd)

## License

MIT
