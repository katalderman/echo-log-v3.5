import { useEffect, useState } from "react";
import {
  AlertCircle, Check, ChevronDown, ChevronRight, Loader2, Pencil, RefreshCw, Video, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncRow } from "../data";

type Props = {
  onCancel: () => void;
  onConfirm: (rows: SyncRow[]) => void;
  syncFields: { key: string; label: string; value: string }[];
  skippedCount: number;
};

/**
 * SyncModal — the "Sync to Salesforce?" overlay.
 *
 * Only confirmed fields are passed in (skipped fields stay out). Each row
 * is editable inline — edits become part of the payload handed back to
 * `onConfirm` so the caller can persist exactly what was written.
 */
export function SyncModal({ onCancel, onConfirm, syncFields, skippedCount }: Props) {
  const [showLineage, setShowLineage] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepState, setStepState] = useState<0 | 1 | 2 | 3>(0);
  const [simulateError, setSimulateError] = useState(false);
  const [errored, setErrored] = useState(false);

  const fieldCount = syncFields.length;

  const SYNC_STEPS = [
    { label: "Validating field permissions...", done: "Field permissions validated", ms: 400 },
    { label: `Writing ${fieldCount} field${fieldCount === 1 ? "" : "s"} to Maya Chen's record...`, done: `${fieldCount} field${fieldCount === 1 ? "" : "s"} written to Maya Chen's record`, ms: 800 },
    { label: "Logging activity to pipeline...", done: "Activity logged to pipeline", ms: 600 },
  ];

  const [rows, setRows] = useState<SyncRow[]>(
    syncFields.map((f) => ({ ...f, original: f.value, edited: false })),
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const editedCount = rows.filter((r) => r.edited).length;

  const startEdit = (r: SyncRow) => {
    setEditingKey(r.key);
    setDraft(r.value);
  };
  const saveEdit = () => {
    if (!editingKey) return;
    setRows((arr) =>
      arr.map((r) =>
        r.key === editingKey
          ? { ...r, value: draft.trim() || r.value, edited: (draft.trim() || r.value) !== r.original }
          : r,
      ),
    );
    setEditingKey(null);
  };
  const revert = (key: string) => {
    setRows((arr) => arr.map((r) => (r.key === key ? { ...r, value: r.original, edited: false } : r)));
  };

  // Stepped sync animation: each row resolves in sequence; progress fills smoothly.
  useEffect(() => {
    if (!syncing || errored) return;
    const totalMs = SYNC_STEPS.reduce((a, s) => a + s.ms, 0);
    const cumulative = [SYNC_STEPS[0].ms, SYNC_STEPS[0].ms + SYNC_STEPS[1].ms, totalMs];
    const start = Date.now();
    const i = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      if (simulateError && elapsed >= SYNC_STEPS[0].ms + 200) {
        setErrored(true);
        window.clearInterval(i);
        return;
      }
      if (elapsed >= cumulative[2]) {
        setStepState(3);
        window.clearInterval(i);
        window.setTimeout(() => onConfirm(rows), 250);
      } else if (elapsed >= cumulative[1]) setStepState(2);
      else if (elapsed >= cumulative[0]) setStepState(1);
    }, 50);
    return () => window.clearInterval(i);
  }, [syncing, errored, simulateError, onConfirm]); // eslint-disable-line react-hooks/exhaustive-deps

  const retrySync = () => {
    setErrored(false);
    setProgress(0);
    setStepState(0);
    setSimulateError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center px-4 py-8">
      <div className="bg-card border border-border rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between">
          <div>
            <div className="font-semibold text-[22px] leading-tight">Sync to Salesforce?</div>
            <div className="text-[13px] text-muted-foreground mt-1">
              Review and edit if needed. {fieldCount} field{fieldCount === 1 ? "" : "s"}{skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}, 1 summary, and 1 voice note will be added to Maya Chen's contact record.
            </div>
          </div>
          {!syncing && (
            <button onClick={onCancel} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
          )}
        </div>

        {syncing && !errored ? (
          <div className="p-6">
            <div className="text-[13px] mb-3 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Syncing to Salesforce…
            </div>
            <div className="w-full h-1.5 bg-secondary rounded overflow-hidden mb-4">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-2">
              {SYNC_STEPS.map((s, i) => {
                const done = stepState > i;
                const active = stepState === i;
                return (
                  <div
                    key={s.label}
                    className={cn(
                      "flex items-center gap-2 text-[12px] px-3 py-2 border rounded",
                      done ? "border-success/40 bg-success/5" : "border-border bg-card",
                    )}
                  >
                    {done ? (
                      <span className="w-4 h-4 rounded-full bg-success grid place-items-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-border bg-secondary shrink-0" />
                    )}
                    <span className={cn(done ? "text-success font-medium" : active ? "font-medium" : "text-muted-foreground")}>
                      {done ? s.done : s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : errored ? (
          <div className="p-5 space-y-4">
            <div className="bg-destructive/5 border border-l-4 border-l-destructive border-destructive/30 rounded p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-destructive">Sync failed.</div>
                  <div className="text-[12px] text-foreground/80 mt-1 leading-relaxed">
                    Maya Chen's record is currently locked by another user. Your draft is saved — try again in a few minutes.
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Path stays at <span className="font-medium text-foreground">Fields Confirmed</span>. Nothing was committed to Salesforce.
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => { setSyncing(false); setErrored(false); onCancel(); }}
                className="h-9 px-4 text-[12px] border border-border rounded hover:bg-secondary"
              >
                Save Draft & Exit
              </button>
              <button
                onClick={retrySync}
                className="h-9 px-5 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
              </button>
            </div>
          </div>
        ) : null}

        {!syncing && !errored && (
          <>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              <div className="bg-info border border-info-border rounded px-3 py-2.5">
                <div className="text-[20px] font-semibold leading-tight num text-primary flex items-center gap-1.5">
                  {fieldCount}
                  {editedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning/10 border border-warning/40 px-1.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" /> {editedCount} edited
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium">Fields</div>
                <div className="text-[10px] text-muted-foreground">{skippedCount > 0 ? `confirmed · ${skippedCount} skipped` : "confirmed"}</div>
              </div>
              <div className="bg-info border border-info-border rounded px-3 py-2.5">
                <div className="text-[20px] font-semibold leading-tight num text-primary">1</div>
                <div className="text-[11px] font-medium">Summary</div>
                <div className="text-[10px] text-muted-foreground">confirmed</div>
              </div>
              <div className="bg-info border border-info-border rounded px-3 py-2.5">
                <div className="text-[20px] font-semibold leading-tight num text-primary">1</div>
                <div className="text-[11px] font-medium">Activity</div>
                <div className="text-[10px] text-muted-foreground">call logged</div>
              </div>
            </div>

            <div className="px-5 pb-4">
              <button
                onClick={() => setShowLineage((v) => !v)}
                className="w-full px-3 py-2 border border-border rounded text-[12px] font-semibold flex items-center gap-1.5 hover:bg-secondary/50"
              >
                {showLineage ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                What changes in Salesforce
                {editedCount > 0 && (
                  <span className="ml-auto text-[10px] font-medium text-warning bg-warning/10 border border-warning/40 px-1.5 py-0.5 rounded">
                    {editedCount} edited
                  </span>
                )}
              </button>
              {showLineage && (
                <div className="border border-t-0 border-border rounded-b -mt-px divide-y divide-border animate-fade-in">
                  {rows.map((f) => {
                    const isEditing = editingKey === f.key;
                    return (
                      <div
                        key={f.key}
                        className={cn(
                          "group px-3 py-2 transition-colors",
                          !isEditing && "hover:bg-[#F8FAFD] cursor-pointer",
                          f.edited && "border-l-2 border-l-warning",
                        )}
                        onClick={() => !isEditing && startEdit(f)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
                            {isEditing ? (
                              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  value={draft}
                                  onChange={(e) => setDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit();
                                    if (e.key === "Escape") setEditingKey(null);
                                  }}
                                  className="flex-1 text-[12px] px-2 py-1 border border-primary rounded outline-none ring-1 ring-primary/30 bg-card"
                                />
                                <button
                                  onClick={saveEdit}
                                  className="h-7 w-7 grid place-items-center bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                  title="Save"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingKey(null)}
                                  className="h-7 w-7 grid place-items-center border border-border text-muted-foreground rounded hover:bg-secondary"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-[12px] mt-0.5">{f.value}</div>
                            )}
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              {f.edited ? (
                                <span className="group/badge relative text-[10px] bg-warning/10 border border-warning/40 text-warning px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <Pencil className="w-2.5 h-2.5" />
                                  Edited by you · was: <span className="italic max-w-[180px] truncate">"{f.original}"</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); revert(f.key); }}
                                    className="ml-1 text-primary hover:underline opacity-0 group-hover/badge:opacity-100 transition-opacity"
                                  >
                                    Revert to AI value
                                  </button>
                                </span>
                              ) : (
                                <span className="text-[10px] bg-info border border-info-border text-primary px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5" /> From your call with Maya
                                </span>
                              )}
                            </div>
                          </div>
                          {!isEditing && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(f); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded text-primary shrink-0"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-3">
                Edits are saved on Confirm & Sync. This action can be undone within 24 hours.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 mr-auto select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateError}
                  onChange={(e) => setSimulateError(e.target.checked)}
                  className="accent-destructive"
                />
                Simulate sync error
              </label>
              <button
                onClick={onCancel}
                disabled={syncing}
                className="h-9 px-4 text-[12px] border border-border rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => setSyncing(true)}
                disabled={syncing}
                className="h-9 px-5 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                Confirm & Sync
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
