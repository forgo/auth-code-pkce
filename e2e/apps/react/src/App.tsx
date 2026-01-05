import { useMemo } from 'react';
import { AuthProvider, useAuth } from '@auth-code-pkce/react';
import { getAppConfig, buildProviderConfig } from '@auth-code-pkce/test-app-shared';

function AuthStatus() {
  const { isAuthenticated, isLoading, jwt, error, login, logout } = useAuth();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error) {
    return (
      <div data-testid="error">
        {error.code}: {error.message}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div data-testid="logged-out">
        <h1>Not logged in</h1>
        <button data-testid="login-btn" onClick={() => login()}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div data-testid="logged-in">
      <h1>Welcome!</h1>
      <div data-testid="user-sub">{jwt?.sub}</div>
      <div data-testid="user-email">{jwt?.email}</div>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

export function App() {
  // Read config at render time so URL params are available
  const provider = useMemo(() => {
    const config = getAppConfig();
    return buildProviderConfig(config);
  }, []);

  return (
    <AuthProvider
      provider={provider}
      loadingComponent={<div data-testid="loading">Loading...</div>}
    >
      <AuthStatus />
    </AuthProvider>
  );
}
