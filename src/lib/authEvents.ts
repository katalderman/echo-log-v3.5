/**
 * Cross-module signal used to converge "auth is no longer valid" handling.
 *
 * Sources:
 *   - AuthGate's onAuthStateChange listener on SIGNED_OUT / token refresh failure
 *   - Global React Query QueryCache.onError when a query returns 401 / JWT errors
 *
 * Sink:
 *   - AuthGate listens for this event, toasts the user, and redirects to /auth.
 */
export const AUTH_EXPIRED_EVENT = "pulse:auth-expired";

type SupabaseLikeError = {
  status?: number;
  code?: string | number;
  message?: string;
};

/** Detect a 401-shaped error from Supabase / PostgREST / fetch wrappers. */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as SupabaseLikeError;
  if (e.status === 401 || e.status === 403) return true;
  if (e.code === "PGRST301" || e.code === 401) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("jwt expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("jwt is missing") ||
    msg.includes("not authenticated")
  );
}
