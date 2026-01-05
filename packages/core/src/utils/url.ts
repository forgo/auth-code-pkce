/**
 * Parse authorization callback URL for OAuth parameters
 *
 * @param url URL to parse (defaults to current window location)
 * @returns Object containing code, state, and error parameters
 */
export function parseCallbackUrl(url?: string): {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const urlToParse = url ?? (typeof window !== "undefined" ? window.location.href : "");

  try {
    const parsedUrl = new URL(urlToParse);
    const params = parsedUrl.searchParams;

    return {
      code: params.get("code"),
      state: params.get("state"),
      error: params.get("error"),
      errorDescription: params.get("error_description"),
    };
  } catch {
    return {
      code: null,
      state: null,
      error: null,
      errorDescription: null,
    };
  }
}

/**
 * Check if current URL is an OAuth callback
 *
 * @param redirectUri The expected redirect URI path
 * @param url URL to check (defaults to current window location)
 * @returns true if URL matches callback pattern
 */
export function isCallbackUrl(redirectUri: string, url?: string): boolean {
  const urlToCheck = url ?? (typeof window !== "undefined" ? window.location.href : "");

  try {
    const parsedUrl = new URL(urlToCheck);
    const { code, error } = parseCallbackUrl(urlToCheck);

    // Check if path matches redirect URI and has code or error
    const redirectPath = new URL(redirectUri, parsedUrl.origin).pathname;
    return parsedUrl.pathname === redirectPath && (code !== null || error !== null);
  } catch {
    return false;
  }
}

/**
 * Build URL with query parameters
 *
 * @param baseUrl Base URL
 * @param params Query parameters
 * @returns URL with query string
 */
export function buildUrl(
  baseUrl: string,
  params: Record<string, string | undefined>
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Get the current path (for preserving pre-auth location)
 *
 * @returns Current pathname + search + hash
 */
export function getCurrentPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.pathname + window.location.search + window.location.hash;
}

/**
 * Get the current origin
 *
 * @returns Current origin or empty string if not in browser
 */
export function getCurrentOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}
