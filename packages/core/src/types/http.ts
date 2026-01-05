/**
 * HTTP request configuration
 */
export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
}

/**
 * HTTP response structure
 */
export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers?: Record<string, string>;
}

/**
 * HTTP client interface for making requests
 *
 * Implement this interface to use a custom HTTP client (axios, ky, etc.)
 * The default implementation uses the Fetch API.
 */
export interface HttpClient {
  /**
   * Make an HTTP request
   * @param request Request configuration
   * @returns Promise resolving to the response
   */
  request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}

/**
 * Token injection callback type
 *
 * Called before each authenticated request to inject the access token.
 * Default implementation adds Bearer token to Authorization header.
 */
export type TokenInjector = (params: {
  headers: Record<string, string>;
  accessToken: string;
}) => Record<string, string>;

/**
 * Default Bearer token injector
 */
export const bearerTokenInjector: TokenInjector = ({ headers, accessToken }) => ({
  ...headers,
  Authorization: `Bearer ${accessToken}`,
});

/**
 * Create a default HTTP client using the Fetch API
 */
export function createFetchHttpClient(): HttpClient {
  return {
    async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body:
          req.body instanceof URLSearchParams ? req.body.toString() : req.body,
        mode: 'cors',
      });

      let data: T;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as T;
      }

      return {
        status: response.status,
        data,
      };
    },
  };
}
