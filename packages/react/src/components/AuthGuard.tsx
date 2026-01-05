import React, { type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth.js";

/**
 * Props for AuthGuard component
 */
export interface AuthGuardProps {
  /** Content to show when authenticated */
  children: ReactNode;

  /** Content to show when not authenticated (default: null) */
  fallback?: ReactNode;

  /** Whether to redirect to login when not authenticated */
  redirectToLogin?: boolean;
}

/**
 * Component that protects content requiring authentication
 *
 * @example
 * ```tsx
 * // Show fallback when not authenticated
 * <AuthGuard fallback={<LoginPrompt />}>
 *   <ProtectedContent />
 * </AuthGuard>
 *
 * // Redirect to login when not authenticated
 * <AuthGuard redirectToLogin>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  fallback = null,
  redirectToLogin = false,
}: AuthGuardProps): React.ReactNode {
  const { isAuthenticated, isLoading, login } = useAuth();

  // Still loading, show nothing or fallback
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (redirectToLogin) {
      login({ preservePath: true });
      return <>{fallback}</>;
    }
    return <>{fallback}</>;
  }

  // Authenticated, show children
  return <>{children}</>;
}
