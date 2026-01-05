import { useContext } from "react";
import type { JwtPayload } from "@auth-code-pkce/core";
import { AuthContext, type AuthContextValue } from "../context.js";

/**
 * Hook to access authentication state and methods
 *
 * @returns Auth context value with state and methods
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, login, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login()}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.name}</p>
 *       <button onClick={() => logout()}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth<
  TJwt extends JwtPayload = JwtPayload,
  TUser = unknown,
>(): AuthContextValue<TJwt, TUser> {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context as AuthContextValue<TJwt, TUser>;
}
