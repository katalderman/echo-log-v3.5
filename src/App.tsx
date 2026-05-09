import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ReviewPage from "@/features/review/ReviewPage";
import ActiveCallPage from "@/features/active-call/ActiveCallPage";
import SyncedPage from "@/features/synced/SyncedPage";
import PreviousCallsPage from "@/features/history/PreviousCallsPage";
import NotFoundPage from "@/features/not-found/NotFoundPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ReviewPage />} />
          <Route path="/calls/active" element={<ActiveCallPage />} />
          <Route path="/calls/complete/:id" element={<SyncedPage />} />
          <Route path="/calls/history" element={<PreviousCallsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
