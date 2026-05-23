import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Field,
  FieldKey,
  SEED_FIELDS,
  SEED_SUMMARY,
  SyncRow,
} from "./data";
import {
  useCall,
  useCallFields,
  useSaveDraft,
  useSyncCall,
  useUpdateCallField,
  type CallFieldRow,
} from "@/lib/queries";

/**
 * useReviewState — owns all state and side effects for the Review & Confirm screen.
 *
 * Reads from Supabase (calls + call_fields) and persists every confirm/skip/edit
 * back through mutation hooks. Local React state mirrors the remote rows so
 * interactions stay instant; mutations fire optimistically.
 */
const ACTIVE_SLUG = "maya-chen";

function rowToField(r: CallFieldRow): Field {
  return {
    key: r.field_key as FieldKey,
    label: r.label,
    value: r.value,
    confidence: r.confidence,
    confirmed: r.confirmed,
    skipped: r.skipped,
    source: {
      speaker: r.source_speaker ?? "",
      ts: r.source_ts ?? "",
      quote: r.source_quote ?? "",
    },
  };
}

export function useReviewState() {
  const navigate = useNavigate();

  const callQuery = useCall(ACTIVE_SLUG);
  const callId = callQuery.data?.id;
  const fieldsQuery = useCallFields(callId);
  const updateField = useUpdateCallField(callId);
  const saveDraftMutation = useSaveDraft();
  const syncCallMutation = useSyncCall();

  // Local mirror — seeded from Supabase, edited optimistically.
  const [fields, setFields] = useState<Field[]>(SEED_FIELDS);
  const [summary, setSummary] = useState(SEED_SUMMARY);
  const hydratedFields = useRef(false);
  const hydratedSummary = useRef(false);

  useEffect(() => {
    if (hydratedFields.current) return;
    const rows = fieldsQuery.data;
    if (rows && rows.length) {
      setFields(rows.map(rowToField));
      hydratedFields.current = true;
    }
  }, [fieldsQuery.data]);

  useEffect(() => {
    if (hydratedSummary.current) return;
    const s = callQuery.data?.summary;
    if (s) {
      setSummary(s);
      hydratedSummary.current = true;
    }
  }, [callQuery.data?.summary]);

  // Map field key → DB row id, for mutation lookups.
  const idForKey = (k: FieldKey): string | undefined =>
    fieldsQuery.data?.find((r) => r.field_key === k)?.id;

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

  const toggleConfirm = (k: FieldKey) => {
    const target = fields.find((f) => f.key === k);
    if (!target) return;
    const next = { confirmed: !target.confirmed, skipped: false };
    setFields((arr) => arr.map((f) => (f.key === k ? { ...f, ...next } : f)));
    const id = idForKey(k);
    if (id) updateField.mutate({ id, ...next });
  };

  const toggleSkip = (k: FieldKey) => {
    const target = fields.find((f) => f.key === k);
    if (!target) return;
    const next = !target.skipped;
    if (next) {
      toast(`"${target.label}" skipped`, {
        description: "This field will not be synced to Salesforce.",
      });
    }
    setFields((arr) =>
      arr.map((f) =>
        f.key === k ? { ...f, skipped: next, confirmed: next ? false : f.confirmed } : f,
      ),
    );
    const id = idForKey(k);
    if (id) updateField.mutate({ id, skipped: next, confirmed: next ? false : target.confirmed });
  };

  const confirmAll = () => {
    setSummaryReviewed(true);
    const targets = fields.filter((f) => !f.skipped && !f.confirmed);
    setFields((arr) => arr.map((f) => (f.skipped ? f : { ...f, confirmed: true })));
    setPathStep(3);
    for (const t of targets) {
      const id = idForKey(t.key);
      if (id) updateField.mutate({ id, confirmed: true });
    }
    toast.success(`${targets.length} field${targets.length === 1 ? "" : "s"} confirmed`);
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
    const updates: { key: FieldKey; value: string }[] = [];
    setFields((arr) =>
      arr.map((f) => {
        if (f.key === "next") {
          const value = f.value + " + healthcare reference customer";
          updates.push({ key: "next", value });
          return { ...f, value, confirmed: false };
        }
        if (f.key === "objections") {
          const value = f.value + " + needs healthcare proof point";
          updates.push({ key: "objections", value });
          return { ...f, value, confirmed: false };
        }
        return f;
      }),
    );
    for (const u of updates) {
      const id = idForKey(u.key);
      if (id) updateField.mutate({ id, value: u.value, edited: true, confirmed: false });
    }
    setVoiceDiff(null);
    toast.success("Amendment applied to 2 fields");
  };

  const discardVoice = () => {
    setVoiceDiff(null);
    setAmendment("");
  };

  // --- Persistence -------------------------------------------------------
  const saveDraft = () => {
    if (!callId) return;
    saveDraftMutation.mutate(
      { callId, fieldsConfirmed: confirmedCount, fieldsSkipped: skippedCount },
      {
        onSuccess: () => {
          toast.success("Draft saved", {
            description: "Pick up where you left off from your queue.",
          });
          navigate(`/calls/complete/${ACTIVE_SLUG}`);
        },
        onError: () => toast.error("Couldn't save draft — please try again."),
      },
    );
  };

  /**
   * Persist exactly what we just synced. Each row carries its DB id so the
   * mutation hook can update value/edited/confirmed in one shot.
   */
  const doSync = (syncedRows: SyncRow[]) => {
    if (!callId) return;
    const fieldRows = fieldsQuery.data ?? [];
    const rows = syncedRows
      .map((r) => {
        const dbRow = fieldRows.find((x) => x.field_key === r.key);
        return dbRow ? { id: dbRow.id, value: r.value, edited: r.edited } : null;
      })
      .filter((x): x is { id: string; value: string; edited: boolean } => x !== null);

    syncCallMutation.mutate(
      {
        callId,
        summary,
        rows,
        fieldsConfirmed: syncedRows.length,
        fieldsSkipped: skippedCount,
      },
      {
        onSuccess: () => {
          setPathStep(4);
          setSynced(true);
          setSyncedAgo(0);
          setShowSync(false);
          navigate(`/calls/complete/${ACTIVE_SLUG}`);
        },
        onError: () => toast.error("Sync failed — please try again."),
      },
    );
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
    // remote-fetch surface
    isError: callQuery.isError || fieldsQuery.isError,
    error: callQuery.error ?? fieldsQuery.error ?? null,
    isRefetching: callQuery.isRefetching || fieldsQuery.isRefetching,
    refetch: () => {
      callQuery.refetch();
      fieldsQuery.refetch();
    },
  };
}
