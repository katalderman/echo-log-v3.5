import { useEffect, useState } from "react";

/**
 * Returns true only after `active` has been true continuously for `delayMs`.
 * Used to suppress skeleton flashes for fast (<600ms) queries.
 */
export function useDelayedFlag(active: boolean, delayMs = 600): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!active) {
      setDelayed(false);
      return;
    }
    const t = window.setTimeout(() => setDelayed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);
  return delayed;
}
