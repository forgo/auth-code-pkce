import { useAuth } from "./useAuth.js";

/**
 * Hook to access token utilities
 *
 * @returns Object with getAccessToken function and isAuthenticated flag
 *
 * @example
 * ```tsx
 * function ApiCaller() {
 *   const { getAccessToken, isAuthenticated } = useTokens();
 *
 *   const fetchData = async () => {
 *     const token = await getAccessToken();
 *     if (!token) return;
 *
 *     const response = await fetch('/api/data', {
 *       headers: { Authorization: `Bearer ${token}` },
 *     });
 *     // ...
 *   };
 *
 *   return <button onClick={fetchData} disabled={!isAuthenticated}>Fetch</button>;
 * }
 * ```
 */
export function useTokens(): {
  getAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
} {
  const { getAccessToken, isAuthenticated } = useAuth();
  return { getAccessToken, isAuthenticated };
}
