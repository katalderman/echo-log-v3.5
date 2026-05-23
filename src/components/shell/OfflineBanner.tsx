import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/**
 * Persistent connectivity banner.
 *
 * - While offline: sticky destructive banner stays until connection returns.
 * - On reconnect: briefly flashes a success banner and invalidates every
 *   React Query so stale views refresh automatically.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const [justReconnected, setJustReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(!online);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setJustReconnected(false);
      return;
    }
    if (wasOffline) {
      setJustReconnected(true);
      qc.invalidateQueries();
      const t = window.setTimeout(() => {
        setJustReconnected(false);
        setWasOffline(false);
      }, 2500);
      return () => window.clearTimeout(t);
    }
  }, [online, wasOffline, qc]);

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-[12px] font-medium flex items-center justify-center gap-2 shadow"
      >
        <WifiOff className="w-3.5 h-3.5" />
        You're offline — Pulse will reconnect automatically when your connection is restored.
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 bg-success text-success-foreground px-4 py-2 text-[12px] font-medium flex items-center justify-center gap-2 shadow"
      >
        <Wifi className="w-3.5 h-3.5" />
        Back online — refreshing your data…
      </div>
    );
  }

  return null;
}
