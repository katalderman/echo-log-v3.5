import { useState } from "react";
import {
  Phone, Search, ChevronRight, ChevronDown, X, Check, Pencil, Video, FileText, Upload, Link2,
  Mic, Square, Bold, Italic, Strikethrough, List, ListOrdered, AtSign,
  CheckCircle2, RefreshCw, Filter, Mail, ClipboardList,
  StickyNote, Quote, Eye, Plus, Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavRail, TopBar, BreadcrumbTabs } from "@/components/shell/Shell";
import { Field, FieldKey, TIMELINE_GROUPS } from "./data";
import { useReviewState } from "./useReviewState";
import { SyncModal } from "./components/SyncModal";
import { ImportModal } from "./components/ImportModal";

/**
 * ReviewPage — the heart of the prototype.
 *
 * Display only. All state and persistence live in `useReviewState`.
 * The page composes a fixed three-column layout (about / center / activity)
 * plus modals that the hook toggles.
 */
export default function ReviewPage() {
  const r = useReviewState();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <BreadcrumbTabs
          crumbs={[{ label: "Calls", to: "/" }, { label: "Active Review" }]}
          tab={{ label: "Maya Chen — Northwind Robotics", closable: true }}
          tabIcon={Phone}
        />
        <StatBanner onImport={() => r.setShowImport(true)} />

        <main className="flex-1 px-6 py-4 space-y-4">
          <RecordHeader synced={r.synced} syncedAgo={r.syncedAgo} />
          <SourceBanner />
          <PathBar step={r.pathStep} />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><AboutCard /></div>

            <div className="col-span-6 space-y-4">
              <CenterHeader
                synced={r.synced}
                confirmedCount={r.confirmedCount}
                skippedCount={r.skippedCount}
                resolvedCount={r.resolvedCount}
                onConfirmAll={r.confirmAll}
                onSync={() => r.setShowSync(true)}
                onSaveDraft={r.saveDraft}
              />
              <SummaryBlock
                summary={r.summary}
                setSummary={r.setSummary}
                editing={r.editingSummary}
                setEditing={r.setEditingSummary}
                reviewed={r.summaryReviewed}
                setReviewed={r.setSummaryReviewed}
              />
              <div className="space-y-2">
                {r.fields.map((f, i) => (
                  <FieldCard
                    key={f.key}
                    field={f}
                    position={i + 1}
                    total={r.fields.length}
                    expanded={r.expandedSources.has(f.key)}
                    onToggleSource={() => r.toggleSource(f.key)}
                    onConfirm={() => r.toggleConfirm(f.key)}
                    onSkip={() => r.toggleSkip(f.key)}
                    diff={r.voiceDiff?.includes(f.key)}
                  />
                ))}
              </div>
              <AmendmentInput
                amendment={r.amendment}
                setAmendment={r.setAmendment}
                recording={r.recording}
                recMs={r.recMs}
                transcribing={r.transcribing}
                onStart={r.startRecord}
                onStop={r.stopRecord}
                voiceDiff={r.voiceDiff}
                onApply={r.applyVoice}
                onDiscard={r.discardVoice}
              />
            </div>

            <div className="col-span-3 space-y-4">
              <ActivityTimeline />
              <PipelineReviewPreview synced={r.synced} />
            </div>
          </div>
        </main>

        <TodoFooter />
      </div>

      {r.recording && <FloatingRecChip ms={r.recMs} onStop={r.stopRecord} />}
      {r.showSync && (
        <SyncModal
          onCancel={() => r.setShowSync(false)}
          onConfirm={r.doSync}
          syncFields={r.fields.filter((f) => !f.skipped).map((f) => ({ key: f.key, label: f.label, value: f.value }))}
          skippedCount={r.skippedCount}
        />
      )}
      {r.showImport && <ImportModal onClose={() => r.setShowImport(false)} />}
    </div>
  );
}

// ============================================================================
// Subcomponents — display only.
// They live here because they are tightly coupled to ReviewPage's layout.
// If any grow into their own concept, promote them to /components.
// ============================================================================

function StatBanner({ onImport }: { onImport: () => void }) {
  return (
    <div className="bg-accent/60 border-b border-border px-6 py-4">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[15px] font-semibold">Pulse · Today's Review Queue</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">Pulse drafts. You confirm. Salesforce syncs.</div>
        </div>
        <div className="flex gap-3 flex-1 max-w-2xl">
          <StatTile value="12" label="Calls awaiting review" />
          <StatTile value="22s" label="Avg review time" sub="vs 4.5min manual" good />
          <StatTile value="47%" label="Team adoption today" sub="goal: 50%" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onImport} className="h-8 px-3 text-[12px] font-medium border border-primary text-primary rounded hover:bg-primary/5 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Import Transcript
          </button>
          <button className="h-8 px-3 text-[12px] font-medium border border-border rounded hover:bg-secondary flex items-center gap-1.5">
            <Plug className="w-3.5 h-3.5" /> Connect Source
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label, sub, good }: { value: string; label: string; sub?: string; good?: boolean }) {
  return (
    <div className="flex-1 bg-card border border-border rounded px-3 py-2">
      <div className={cn("text-[20px] font-semibold leading-tight num", good && "text-success")}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function RecordHeader({ synced, syncedAgo }: { synced: boolean; syncedAgo: number }) {
  return (
    <div className="bg-card border border-border rounded p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-teal grid place-items-center shrink-0">
        <Phone className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Video className="w-3 h-3" /> Call Review · Drafted from Zoom
        </div>
        <div className="text-[22px] font-semibold leading-tight">Maya Chen</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">
          {synced ? (
            <span className="text-success font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Synced to Salesforce {syncedAgo === 0 ? "just now" : `${syncedAgo} min ago`}
            </span>
          ) : (
            <>Drafted from your <span className="font-medium text-foreground">24-minute Zoom call</span> with Maya Chen, ended 12 minutes ago. Nothing has synced yet.</>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceBanner() {
  return (
    <div className="bg-info border border-info-border rounded px-4 py-2.5 flex items-center gap-4 text-[12px]">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-[#2D8CFF] grid place-items-center"><Video className="w-3 h-3 text-white" /></div>
        <span className="font-semibold">Drafted from your Zoom call · 24m 18s · Apr 28, 2026 · 2:00 PM</span>
      </div>
      <div className="flex-1 text-muted-foreground">
        AI processed the meeting transcript. Review the 7 fields below and confirm what's accurate.
      </div>
      <a className="text-primary font-medium hover:underline shrink-0 cursor-pointer">View full transcript →</a>
    </div>
  );
}

function PathBar({ step }: { step: number }) {
  const steps = ["Call Ended", "AI Drafted", "Ready for Review", "Fields Confirmed", "Synced to Salesforce"];
  return (
    <div className="bg-card border border-border rounded p-2 flex items-center gap-1">
      <div className="flex-1 flex items-center gap-0">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={s}
              className={cn(
                "h-9 px-4 -ml-2 first:ml-0 flex items-center justify-center text-[11px] font-medium gap-1.5 flex-1",
                i === 0 ? "path-chevron-first" : i === steps.length - 1 ? "path-chevron-last" : "path-chevron",
                done && "bg-success/15 text-success",
                active && "bg-nav text-nav-foreground",
                !done && !active && "bg-secondary text-muted-foreground",
              )}
            >
              {done && <Check className="w-3 h-3" />}
              {s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AboutCard() {
  return (
    <div className="bg-card border border-border rounded text-[12px]">
      <div className="px-3 py-2 border-b border-border font-semibold text-[13px]">About this Call</div>
      <Section title="Meeting Source" defaultOpen>
        <Row label="Platform" value={<span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-[#2D8CFF]" /> Zoom Meeting</span>} />
        <Row label="Status" value={<span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>} />
        <Row label="Duration" value="24m 18s" />
        <Row label="Date / Time" value="Apr 28, 2026 · 2:00 PM" />
        <Row label="Recording" value={<a className="text-primary hover:underline cursor-pointer">Open in Zoom ↗</a>} />
        <Row label="Transcript" value={<a className="text-primary hover:underline cursor-pointer">View transcript</a>} />
      </Section>
      <Section title="Contact Details">
        <Row label="Name" value="Maya Chen" edit />
        <Row label="Title" value="Director of RevOps" edit />
        <Row label="Email" value="maya@northwind-robotics.io" edit />
        <Row label="Phone" value="+1 (415) 555-0142" edit />
      </Section>
      <Section title="Deal Context">
        <Row label="Account" value="Northwind Robotics" edit />
        <Row label="Stage" value="Qualification" edit />
        <Row label="Amount" value="$72,000" edit />
        <Row label="Close Date" value="Jun 30, 2026" edit />
      </Section>
    </div>
  );
}

function Section({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold hover:bg-secondary/50">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

function Row({ label, value, edit }: { label: string; value: React.ReactNode; edit?: boolean }) {
  return (
    <div className="group flex items-start justify-between gap-2 py-0.5">
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-[12px] text-foreground">{value}</div>
      </div>
      {edit && <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded shrink-0"><Pencil className="w-3 h-3 text-muted-foreground" /></button>}
    </div>
  );
}

function CenterHeader({ synced, confirmedCount, skippedCount, resolvedCount, onConfirmAll, onSync, onSaveDraft }: {
  synced: boolean; confirmedCount: number; skippedCount: number; resolvedCount: number; onConfirmAll: () => void; onSync: () => void; onSaveDraft: () => void;
}) {
  const total = 7;
  const allResolved = resolvedCount === total;
  const remaining = total - resolvedCount;
  const syncDisabled = !synced && !allResolved;
  const tooltip = syncDisabled ? `Confirm or skip all 7 fields before syncing. (${resolvedCount} of 7 resolved)` : "";
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">
            Review &amp; Confirm <span className="text-muted-foreground font-normal">· {total} Fields from Your Call</span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Pulse drafted these from your Zoom call. Confirm each field — or skip any the AI got wrong — then sync to Salesforce.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allResolved ? (
            <span className="h-8 px-3 text-[12px] font-medium bg-success/10 text-success border border-success/30 rounded flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> All Fields Resolved
            </span>
          ) : (
            <button
              onClick={onConfirmAll}
              className="h-8 px-3 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 shrink-0"
            >
              {resolvedCount === 0 ? "Confirm All Fields" : `Confirm Remaining (${remaining})`}
            </button>
          )}
          <button
            onClick={onSaveDraft}
            disabled={synced}
            className="h-8 px-3 text-[12px] font-medium border border-primary text-primary rounded hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Save as Draft
          </button>
          <span title={tooltip} className={cn(syncDisabled && "cursor-not-allowed")}>
            <button
              onClick={onSync}
              disabled={synced || syncDisabled}
              className="h-9 px-4 text-[12px] font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:pointer-events-none shrink-0"
            >
              {synced ? "Synced" : "Confirm & Sync to Salesforce"}
            </button>
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex">
          <div className="h-full bg-success transition-all duration-300" style={{ width: `${(confirmedCount / total) * 100}%` }} />
          <div className="h-full bg-muted-foreground/40 transition-all duration-300" style={{ width: `${(skippedCount / total) * 100}%` }} />
        </div>
        <div className={cn("text-[11px] font-medium", allResolved ? "text-success" : "text-muted-foreground")}>
          {allResolved
            ? `Ready to sync · ${confirmedCount} confirmed${skippedCount ? `, ${skippedCount} skipped` : ""}`
            : `${confirmedCount} confirmed${skippedCount ? ` · ${skippedCount} skipped` : ""} · ${total - resolvedCount} remaining`}
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ summary, setSummary, editing, setEditing, reviewed, setReviewed }: {
  summary: string; setSummary: (s: string) => void; editing: boolean; setEditing: (b: boolean) => void;
  reviewed: boolean; setReviewed: (b: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="bg-info border border-info-border rounded p-3 flex gap-3">
        <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <div className="text-[13px] italic">"Zoom already gives me a summary. Why am I retyping it into Salesforce?"</div>
          <div className="text-[11px] text-muted-foreground mt-1">— Senior AE, customer interview</div>
        </div>
      </div>
      <div
        className={cn(
          "bg-card border rounded p-3 transition-colors cursor-text",
          editing ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-muted-foreground/40",
          reviewed && !editing && "border-l-4 border-l-success",
        )}
        onClick={() => { setEditing(true); setReviewed(true); }}
      >
        {editing ? (
          <textarea
            autoFocus
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full min-h-[120px] text-[13px] leading-relaxed bg-transparent outline-none resize-none"
          />
        ) : (
          <p className="text-[13px] leading-relaxed">{summary}</p>
        )}
        <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border flex items-center gap-1">
          <Video className="w-3 h-3" /> Generated from a 24-minute conversation with Maya Chen on Zoom.
          {reviewed && <span className="ml-auto text-success font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Reviewed</span>}
        </div>
      </div>
    </div>
  );
}

function FieldCard({ field, position, total, expanded, onToggleSource, onConfirm, onSkip, diff }: {
  field: Field; position: number; total: number; expanded: boolean; onToggleSource: () => void; onConfirm: () => void; onSkip: () => void; diff?: boolean;
}) {
  const dot = field.confidence === "high" ? "bg-success" : field.confidence === "med" ? "bg-warning" : "bg-destructive";
  const dotLabel = field.confidence === "high" ? "High confidence" : field.confidence === "med" ? "Medium confidence" : "Low confidence";
  return (
    <div
      className={cn(
        "bg-card border border-border rounded transition-all relative",
        field.confirmed && "border-l-4 border-l-success",
        field.skipped && "border-l-4 border-l-muted-foreground/50 opacity-70",
        diff && "ring-2 ring-primary/50 bg-accent/30",
      )}
    >
      <span
        className={cn(
          "absolute top-2 right-3 font-mono text-[10px] tabular-nums",
          field.confirmed ? "text-success" : "text-muted-foreground",
        )}
      >
        {position} of {total}
      </span>
      <div className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0 pr-12">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{field.label}</span>
            <span className={cn("w-2 h-2 rounded-full", dot)} title={dotLabel} />
            <span className="text-[10px] bg-info border border-info-border text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
              <Video className="w-2.5 h-2.5" /> From your call
            </span>
            {!field.confirmed && !field.skipped && !diff && (
              <span className="text-[10px] font-bold text-warning-foreground bg-[#FFF7E6] border border-warning/40 px-1.5 py-0.5 rounded">Draft</span>
            )}
            {field.skipped && (
              <span className="text-[10px] font-bold text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded flex items-center gap-1">
                <X className="w-2.5 h-2.5" /> Skipped — won't sync
              </span>
            )}
            {diff && (
              <span className="text-[10px] font-bold text-primary bg-accent border border-primary/30 px-1.5 py-0.5 rounded">Voice update</span>
            )}
          </div>
          <div className={cn("text-[14px] text-foreground mt-1", field.skipped && "line-through text-muted-foreground")}>{field.value}</div>
          <button
            onClick={onToggleSource}
            className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> {expanded ? "Hide source" : "View source"}
          </button>
          {expanded && (
            <div className="mt-2 bg-secondary/60 border-l-2 border-primary rounded-r p-2 text-[12px] animate-fade-in">
              <div className="text-[10px] text-muted-foreground mb-0.5">{field.source.speaker} at {field.source.ts}</div>
              <div className="italic">"{field.source.quote}"</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={onConfirm}
            className={cn(
              "h-7 px-3 text-[11px] font-medium rounded border",
              field.confirmed
                ? "bg-success text-success-foreground border-success"
                : "border-primary text-primary hover:bg-primary/5",
            )}
          >
            {field.confirmed ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Confirmed</span> : "Confirm"}
          </button>
          <button
            onClick={onSkip}
            title={field.skipped ? "Restore this field" : "Skip — don't sync this field to Salesforce"}
            className={cn(
              "h-7 px-3 text-[11px] font-medium rounded border",
              field.skipped
                ? "bg-muted-foreground/10 text-foreground border-muted-foreground/40"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {field.skipped ? <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Restore</span> : <span className="flex items-center gap-1"><X className="w-3 h-3" /> Skip</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

function AmendmentInput({
  amendment, setAmendment, recording, recMs, transcribing, onStart, onStop, voiceDiff, onApply, onDiscard,
}: {
  amendment: string; setAmendment: (s: string) => void;
  recording: boolean; recMs: number; transcribing: boolean;
  onStart: () => void; onStop: () => void;
  voiceDiff: FieldKey[] | null; onApply: () => void; onDiscard: () => void;
}) {
  const secs = (recMs / 1000).toFixed(0).padStart(2, "0");
  return (
    <div className="bg-card border border-border rounded">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-1 text-muted-foreground">
        {[Bold, Italic, Strikethrough, Link2, List, ListOrdered, AtSign].map((I, i) => (
          <button key={i} className="p-1 hover:bg-secondary rounded"><I className="w-3.5 h-3.5" /></button>
        ))}
      </div>
      <textarea
        value={amendment}
        onChange={(e) => setAmendment(e.target.value)}
        placeholder="Add what the AI missed, or @mention someone…"
        className="w-full px-3 py-2 text-[13px] min-h-[70px] bg-transparent outline-none resize-none"
      />
      <div className="px-3 py-2 border-t border-border flex items-center gap-2">
        <button
          onClick={recording ? onStop : onStart}
          className={cn(
            "h-8 px-3 text-[12px] rounded border flex items-center gap-1.5",
            recording
              ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
              : "border-primary text-primary hover:bg-primary/5",
          )}
        >
          {recording ? <><Square className="w-3 h-3 fill-current" /> Recording… 00:{secs} · Click to stop</>
            : transcribing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Transcribing…</>
            : <><Mic className="w-3 h-3" /> Click to record voice note</>}
        </button>
        {voiceDiff && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Will update {voiceDiff.length} fields</span>
            <button onClick={onDiscard} className="h-7 px-2 text-[11px] border border-border rounded hover:bg-secondary">Discard</button>
            <button onClick={onApply} className="h-7 px-2 text-[11px] bg-primary text-primary-foreground rounded hover:bg-primary/90">Apply amendment</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FloatingRecChip({ ms, onStop }: { ms: number; onStop: () => void }) {
  const secs = (ms / 1000).toFixed(0).padStart(2, "0");
  return (
    <button
      onClick={onStop}
      className="fixed bottom-12 right-6 z-50 h-10 px-4 bg-destructive text-destructive-foreground rounded-full shadow-lg flex items-center gap-2 text-[12px] font-medium animate-pulse"
    >
      <span className="w-2 h-2 rounded-full bg-white" />
      Recording 00:{secs} · Click to stop
    </button>
  );
}

function ActivityTimeline() {
  const filters = [
    { I: Filter, label: "All", active: true },
    { I: Phone, label: "Calls" },
    { I: Mail, label: "Emails" },
    { I: ClipboardList, label: "Tasks" },
    { I: StickyNote, label: "Notes" },
  ];
  return (
    <div className="bg-card border border-border rounded text-[12px]">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-[13px]">Activity Timeline</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button className="p-1 hover:bg-secondary rounded"><RefreshCw className="w-3 h-3" /></button>
          <button className="p-1 hover:bg-secondary rounded"><ChevronDown className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="px-3 py-2 border-b border-border flex items-center gap-1">
        {filters.map((f) => (
          <button
            key={f.label}
            title={f.label}
            className={cn(
              "p-1.5 rounded border",
              f.active ? "border-primary text-primary bg-accent" : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            <f.I className="w-3 h-3" />
          </button>
        ))}
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {TIMELINE_GROUPS.map((g) => (
          <div key={g.title}>
            <div className="px-3 py-1.5 bg-secondary/50 border-b border-border text-[10px] uppercase tracking-wide font-semibold text-muted-foreground flex items-center gap-1">
              <ChevronDown className="w-3 h-3" /> {g.title}
            </div>
            {g.items.map((it, idx) => (
              <TimelineItemRow key={idx} {...it} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineItemRow({ type, title, when, desc }: { type: string; title: string; when: string; desc: string }) {
  const cfg: Record<string, { I: React.ComponentType<{ className?: string }>; color: string }> = {
    call: { I: Phone, color: "bg-primary text-primary-foreground" },
    email: { I: Mail, color: "bg-warning text-warning-foreground" },
    task: { I: ClipboardList, color: "bg-success text-success-foreground" },
    note: { I: StickyNote, color: "bg-teal text-white" },
  };
  const c = cfg[type] || cfg.note;
  return (
    <div className="px-3 py-2 border-b border-border last:border-b-0 flex gap-2 hover:bg-secondary/30">
      <div className={cn("w-6 h-6 rounded grid place-items-center shrink-0", c.color)}>
        <c.I className="w-3 h-3" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium truncate">{title}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{when}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function PipelineReviewPreview({ synced }: { synced: boolean }) {
  return (
    <div className="bg-card border border-border rounded text-[12px]">
      <div className="px-3 py-2 border-b border-border">
        <div className="text-[13px] font-semibold">Pipeline Review Preview</div>
        <div className="text-[10px] text-muted-foreground">{synced ? "Live in manager forecast." : "Preview: how this looks once you sync."}</div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">Northwind Robotics</span>
          <span className="font-semibold num">$72,000</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Stage</span>
          <span>Qualification → Security Review</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Close</span>
          <span>Jun 30, 2026 (Q2)</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Confidence</span>
          <span className="text-success font-medium">High — exec sponsor</span>
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Latest call snapshot</div>
          <div className="text-[11px] leading-snug">Qualified. CFO Marcus Lee owns budget. Procurement 60 days. Blockers: SSO/audit, Pipedrive migration.</div>
        </div>
      </div>
    </div>
  );
}

function TodoFooter() {
  return (
    <div className="h-9 bg-[#3E3E3C] text-white border-t border-border flex items-center px-4 text-[12px]">
      <ClipboardList className="w-3.5 h-3.5 mr-2" />
      <span className="font-medium">To Do List</span>
      <span className="ml-2 text-white/60">(3)</span>
      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
    </div>
  );
}

// Suppress unused import warnings — these icons are used by sub-features.
void FileText; void Upload; void Search;
