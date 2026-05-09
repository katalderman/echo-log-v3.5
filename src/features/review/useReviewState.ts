import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Field,
  FieldKey,
  SEED_FIELDS,
  SEED_SUMMARY,
  STORAGE_KEYS,
  SyncRow,
  DraftRecord,
} from "./data";

/**
 * useReviewState — owns all state and side effects for the Review & Confirm screen.
 *
 * Splitting this out keeps `ReviewPage.tsx` purely presentational: components
 * receive props and call handlers, but never reach into localStorage or
 * coordinate timers themselves.
 */
export function useReviewState() {
  const navigate = useNavigate();

  const [fields, setFields] = useState<Field[]>(SEED_FIELDS);
  const [summary, setSummary] = useState(SEED_SUMMARY);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryReviewed, setSummaryReviewed] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<FieldKey>>(new Set());
  // path: 0 Call Ended → 1 AI Drafted → 2 Ready → 3 Confirmed → 4 Synced
  const [pathStep, setPathStep] = useState(2);
  const [synced, setSynced] = useState(false);
  const [syncedAgo, setSyncedAgo] = useState(0);
  const [showSync, setShowSync] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Voice amendment recording
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceDiff, setVoiceDiff] = useState<FieldKey[] | null>(null);
  const [amendment, setAmendment] = useState("");
  const recTimer = useRef<number | null>(null);

  const confirmedCount = fields.filter((f) => f.confirmed).length;
  const skippedCount = fields.filter((f) => f.skipped).length;
  const resolvedCount = confirmedCount + skippedCount;

  // Auto-advance the path once every field is resolved.
  useEffect(() => {
    if (resolvedCount === fields.length && pathStep < 3) setPathStep(3);
  }, [resolvedCount, pathStep, fields.length]);

  // "Synced N min ago" ticker.
  useEffect(() => {
    if (!synced) return;
    const t = window.setInterval(() => setSyncedAgo((s) => s + 1), 60_000);
    return () => clearInterval(t);
  }, [synced]);

  const toggleConfirm = (k: FieldKey) =>
    setFields((arr) =>
      arr.map((f) => (f.key === k ? { ...f, confirmed: !f.confirmed, skipped: false } : f)),
    );

  const toggleSkip = (k: FieldKey) =>
    setFields((arr) =>
      arr.map((f) => {
        if (f.key !== k) return f;
        const next = !f.skipped;
        if (next) {
          toast(`"${f.label}" skipped`, {
            description: "This field will not be synced to Salesforce.",
          });
        }
        return { ...f, skipped: next, confirmed: next ? false : f.confirmed };
      }),
    );

  const confirmAll = () => {
    setSummaryReviewed(true);
    const willConfirm = fields.filter((f) => !f.skipped && !f.confirmed).length;
    setFields((arr) => arr.map((f) => (f.skipped ? f : { ...f, confirmed: true })));
    setPathStep(3);
    toast.success(`${willConfirm} field${willConfirm === 1 ? "" : "s"} confirmed`);
  };

  const toggleSource = (k: FieldKey) =>
    setExpandedSources((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  // --- Voice amendment ---------------------------------------------------
  const startRecord = () => {
    setRecording(true);
    setRecMs(0);
    recTimer.current = window.setInterval(() => setRecMs((m) => m + 100), 100);
  };

  const stopRecord = () => {
    setRecording(false);
    if (recTimer.current) clearInterval(recTimer.current);
    setTranscribing(true);
    window.setTimeout(() => {
      setTranscribing(false);
      setVoiceDiff(["next", "objections"]);
      setAmendment(
        "Maya also mentioned wanting a reference customer in healthcare before the Marcus meeting.",
      );
      toast("Voice amendment ready", {
        description: "Review the proposed changes — nothing applied yet.",
      });
    }, 1400);
  };

  const applyVoice = () => {
    if (!voiceDiff) return;
    setFields((arr) =>
      arr.map((f) => {
        if (f.key === "next")
          return { ...f, value: f.value + " + healthcare reference customer", confirmed: false };
        if (f.key === "objections")
          return { ...f, value: f.value + " + needs healthcare proof point", confirmed: false };
        return f;
      }),
    );
    setVoiceDiff(null);
    toast.success("Amendment applied to 2 fields");
  };

  const discardVoice = () => {
    setVoiceDiff(null);
    setAmendment("");
  };

  // --- Persistence -------------------------------------------------------
  const saveDraft = () => {
    try {
      const draft: DraftRecord = {
        id: "maya-chen",
        contact: "Maya Chen",
        company: "Northwind Robotics",
        duration: "24m 18s",
        date: "Apr 28, 2026",
        fieldsConfirmed: confirmedCount,
        fieldsTotal: 7,
        savedAt: new Date().toISOString(),
      };
      const existing: DraftRecord[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.drafts) || "[]",
      );
      const next = [draft, ...existing.filter((d) => d.id !== draft.id)];
      localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(next));
    } catch {
      /* localStorage may be unavailable in private mode — no-op */
    }
    toast.success("Draft saved", {
      description: "Pick up where you left off from your queue.",
    });
    navigate("/calls/complete/maya-chen");
  };

  /**
   * Persist exactly what we just synced so the Synced screen can render
   * reality (edits, skips) instead of a canned snapshot.
   */
  const doSync = (syncedRows: SyncRow[]) => {
    try {
      const syncedFields = syncedRows.map((r) => {
        const src = fields.find((f) => f.key === r.key)?.source;
        return {
          ...r,
          source: src ? `${src.speaker} at ${src.ts}` : "",
        };
      });
      const skippedFields = fields
        .filter((f) => f.skipped)
        .map((f) => ({ key: f.key, label: f.label, value: f.value }));
      localStorage.setItem(
        STORAGE_KEYS.syncedMaya,
        JSON.stringify({
          summary,
          syncedFields,
          skippedFields,
          syncedAt: new Date().toISOString(),
        }),
      );
      // Clear any saved draft now that the call has been synced.
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.drafts) || "[]");
      localStorage.setItem(
        STORAGE_KEYS.drafts,
        JSON.stringify(drafts.filter((d: DraftRecord) => d.id !== "maya-chen")),
      );
    } catch {
      /* no-op */
    }
    setPathStep(4);
    setSynced(true);
    setSyncedAgo(0);
    setShowSync(false);
    navigate("/calls/complete/maya-chen");
  };

  return {
    // state
    fields,
    summary,
    editingSummary,
    summaryReviewed,
    expandedSources,
    pathStep,
    synced,
    syncedAgo,
    showSync,
    showImport,
    recording,
    recMs,
    transcribing,
    voiceDiff,
    amendment,
    confirmedCount,
    skippedCount,
    resolvedCount,
    // setters
    setSummary,
    setEditingSummary,
    setSummaryReviewed,
    setShowSync,
    setShowImport,
    setAmendment,
    // actions
    toggleConfirm,
    toggleSkip,
    confirmAll,
    toggleSource,
    startRecord,
    stopRecord,
    applyVoice,
    discardVoice,
    saveDraft,
    doSync,
  };
}
