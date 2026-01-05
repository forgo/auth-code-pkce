import type { JwtPayload } from "@auth-code-pkce/core";
import { useAuth } from "./useAuth.js";

/**
 * Hook to access current user and JWT
 *
 * @returns Object with user, jwt, and isLoading
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const { user, jwt, isLoading } = useUser<MyJwt, MyUser>();
 *
 *   if (isLoading) return <Loading />;
 *   if (!user) return <p>Not logged in</p>;
 *
 *   return <p>Hello, {user.name}!</p>;
 * }
 * ```
 */
export function useUser<
  TUser = unknown,
  TJwt extends JwtPayload = JwtPayload,
>(): {
  user: TUser | null;
  jwt: TJwt | null;
  isLoading: boolean;
} {
  const { user, jwt, isLoading } = useAuth<TJwt, TUser>();
  return { user, jwt, isLoading };
}
