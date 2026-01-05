<script lang="ts">
  import { auth } from './auth';
</script>

{#if $auth.isLoading}
  <div data-testid="loading">Loading...</div>
{:else if $auth.error}
  <div data-testid="error">{$auth.error.code}: {$auth.error.message}</div>
{:else if !$auth.isAuthenticated}
  <div data-testid="logged-out">
    <h1>Not logged in</h1>
    <button data-testid="login-btn" onclick={() => auth.login()}>Login</button>
  </div>
{:else}
  <div data-testid="logged-in">
    <h1>Welcome!</h1>
    <div data-testid="user-sub">{$auth.jwt?.sub}</div>
    <div data-testid="user-email">{$auth.jwt?.email}</div>
    <button data-testid="logout-btn" onclick={() => auth.logout()}>Logout</button>
  </div>
{/if}
