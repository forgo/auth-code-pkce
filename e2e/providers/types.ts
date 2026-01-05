/**
 * Identity Provider configuration for E2E testing
 */
export interface ProviderConfig {
  /** Provider name (e.g., 'keycloak', 'authentik') */
  name: string;

  /** Provider version for reporting (e.g., '24.0.5', '2024.8.3') */
  version?: string;

  /** Docker image tag used (e.g., 'quay.io/keycloak/keycloak:24.0.5') */
  imageTag?: string;

  /** Base URL of the identity provider */
  baseUrl: string;

  /** OAuth/OIDC endpoints */
  endpoints: {
    authorization: string;
    token: string;
    userinfo: string;
    logout: string;
    health?: string;
  };

  /** Client configuration */
  client: {
    clientId: string;
    redirectUri: string;
    scopes: string[];
  };

  /** Test user credentials */
  testUser: {
    username: string;
    password: string;
    email: string;
  };

  /** Login page selectors (provider-specific) */
  selectors: {
    usernameInput: string;
    passwordInput: string;
    submitButton: string;
    errorMessage: string;
  };

  /**
   * Whether the provider uses a multi-step login flow
   * (username on first page, password on second page)
   */
  multiStepLogin?: boolean;
}

/**
 * Build authorization URL with PKCE parameters
 */
export function buildAuthorizationUrl(
  config: ProviderConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    client_id: config.client.clientId,
    redirect_uri: config.client.redirectUri,
    response_type: 'code',
    scope: config.client.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${config.endpoints.authorization}?${params}`;
}

/**
 * Known PKCE verifier/challenge pairs for testing
 * SHA256(verifier) = challenge
 */
export const PKCE_TEST_PAIRS = {
  pair1: {
    verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  },
} as const;
