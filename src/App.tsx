import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ReviewPage from "@/features/review/ReviewPage";
import ActiveCallPage from "@/features/active-call/ActiveCallPage";
import SyncedPage from "@/features/synced/SyncedPage";
import PreviousCallsPage from "@/features/history/PreviousCallsPage";
import NotFoundPage from "@/features/not-found/NotFoundPage";
import AuthPage from "@/features/auth/AuthPage";
import AuthGate from "@/features/auth/AuthGate";
import { AUTH_EXPIRED_EVENT, isAuthError } from "@/lib/authEvents";
import { OfflineBanner } from "@/components/shell/OfflineBanner";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAuthError(error)) {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
    },
  }),
  // Write failures: auth errors funnel into the same /auth redirect; everything
  // else gets a "Couldn't save — Retry" sonner toast that re-runs the exact
  // failed mutation with its original variables. Nothing destructive happens
  // silently. Per-call onError still runs after this (rollback optimistic state).
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      if (isAuthError(error)) {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
        return;
      }
      const msg = (error as { message?: string })?.message ?? "Unknown error";
      toast.error("Couldn't save your changes", {
        description: msg.length > 120 ? msg.slice(0, 117) + "…" : msg,
        action: {
          label: "Retry",
          onClick: () => mutation.execute(variables),
        },
        duration: 8000,
      });
    },
  }),
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ReviewPage />} />
            <Route path="/calls/active" element={<ActiveCallPage />} />
            <Route path="/calls/complete/:id" element={<SyncedPage />} />
            <Route path="/calls/history" element={<PreviousCallsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
