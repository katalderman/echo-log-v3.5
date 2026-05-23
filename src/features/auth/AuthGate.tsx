import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EXPIRED_EVENT } from "@/lib/authEvents";

interface Props {
  children: React.ReactNode;
}

export default function AuthGate({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Subscribe to auth state changes. Also handles SIGNED_OUT and token
  // refresh failures by redirecting to /auth with a toast.
  useEffect(() => {
    let hadSession = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT" && hadSession) {
        toast("Your session expired — please sign in again.");
        navigate("/auth", { replace: true });
      }
      if (event === "TOKEN_REFRESHED" && !s) {
        toast("Your session expired — please sign in again.");
        navigate("/auth", { replace: true });
      }
      hadSession = !!s;
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      hadSession = !!data.session;
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // React Query / fetch wrappers dispatch this event when they see a 401.
  useEffect(() => {
    const handler = () => {
      toast("Your session expired — please sign in again.");
      supabase.auth.signOut().catch(() => {
        /* swallow — we're redirecting anyway */
      });
      navigate("/auth", { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    if (!session && location.pathname !== "/auth") {
      navigate("/auth", { replace: true });
    }
  }, [ready, session, location.pathname, navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!session && location.pathname !== "/auth") {
    return null;
  }

  return <>{children}</>;
}
