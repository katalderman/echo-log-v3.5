import { useEffect, useState } from "react";
import { STORAGE_KEYS, SyncedPayload, DraftRecord } from "../review/data";

/**
 * useSyncedPayload — reads from localStorage what the Review screen wrote.
 *
 * Returns the most-recent sync (so the Synced screen reflects reality),
 * along with any saved drafts to surface in the team-queue nudge.
 */
export function useSyncedPayload(opts: { isHistory: boolean }) {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [syncedPayload, setSyncedPayload] = useState<SyncedPayload | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.drafts) || "[]");
      setDrafts(stored);
    } catch {
      setDrafts([]);
    }
    if (!opts.isHistory) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.syncedMaya);
        if (raw) setSyncedPayload(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, [opts.isHistory]);

  return { drafts, syncedPayload };
}
