import React, { useRef, useEffect, type ReactNode } from "react";
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
  const hasInitiatedLogin = useRef(false);

  // Handle redirect to login in useEffect (not during render)
  // This ensures StrictMode compatibility - side effects belong in effects
  useEffect(() => {
    if (
      !isAuthenticated &&
      !isLoading &&
      redirectToLogin &&
      !hasInitiatedLogin.current
    ) {
      hasInitiatedLogin.current = true;
      login({ preservePath: true });
    }
  }, [isAuthenticated, isLoading, redirectToLogin, login]);

  // Reset the ref when the component would need to re-initiate login
  // (e.g., after logout and re-mount)
  useEffect(() => {
    if (isAuthenticated) {
      hasInitiatedLogin.current = false;
    }
  }, [isAuthenticated]);

  // Still loading, or waiting for redirect to login
  if (isLoading || (!isAuthenticated && redirectToLogin)) {
    return <>{fallback}</>;
  }

  // Not authenticated (without redirect)
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Authenticated, show children
  return <>{children}</>;
}
