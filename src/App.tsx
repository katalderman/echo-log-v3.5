import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAuthError(error)) {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
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
