import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Phone, Search, ChevronRight, ChevronDown, X, Check, Pencil, Video, FileText, Upload, Link2,
  Mic, Square, Bold, Italic, Strikethrough, List, ListOrdered, AtSign,
  CheckCircle2, RefreshCw, Filter, Mail, ClipboardList,
  StickyNote, Quote, Eye, Plus, Plug, FileUp, Calendar,
  AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavRail, TopBar, BreadcrumbTabs } from "@/components/pulse/Shell";

// ============================================================================
// Types & mock data
// ============================================================================

type Confidence = "high" | "med" | "low";
type FieldKey = "outcome" | "next" | "dm" | "budget" | "timeline" | "objections" | "sentiment";

type Field = {
  key: FieldKey;
  label: string;
  value: string;
  confidence: Confidence;
  source: { speaker: string; ts: string; quote: string };
  confirmed: boolean;
};

const SEED_SUMMARY =
  "Maya Chen (Director of RevOps at Northwind Robotics) is evaluating Pulse to replace their stalled internal CRM-logging tool. Decision involves CFO Marcus Lee for budget; Maya holds technical sign-off. Procurement window is 60 days, target implementation Q2. Two open objections: SSO/audit logging requirements and migration path from Pipedrive. Maya asked for a security review and a sandbox account by Friday. Sentiment positive — she has internal exec air-cover from the CEO.";

const SEED_FIELDS: Field[] = [
  {
    key: "outcome", label: "Call outcome", value: "Qualified — moving to security review",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "21:08", quote: "This solves the exact problem we just spent six months failing to solve internally. Send me what your security team needs." },
  },
  {
    key: "next", label: "Next step", value: "Send SOC 2 + sandbox access by Fri Apr 30",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "22:41", quote: "If you can get me the SOC 2 report and a sandbox by Friday, I can have it in front of Marcus on Monday." },
  },
  {
    key: "dm", label: "Decision maker", value: "Marcus Lee (CFO) — budget; Maya — technical",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "11:14", quote: "I own the technical decision but Marcus, our CFO, has to sign off on anything over fifty grand." },
  },
  {
    key: "budget", label: "Budget signal", value: "$60–80K ACV envelope confirmed",
    confidence: "med", confirmed: false,
    source: { speaker: "Maya Chen", ts: "13:02", quote: "We had eighty thousand earmarked for the rebuild. If you come in under that, it's an easier conversation." },
  },
  {
    key: "timeline", label: "Timeline", value: "Q2 2026 implementation; 60-day procurement",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "14:32", quote: "We're looking at Q2 for implementation, though our procurement cycle is usually 60 days." },
  },
  {
    key: "objections", label: "Objections", value: "SSO/audit logs + Pipedrive migration",
    confidence: "med", confirmed: false,
    source: { speaker: "Maya Chen", ts: "17:22", quote: "Two things will kill this — if you can't do SAML SSO with audit logs, and if there's no clean migration off Pipedrive." },
  },
  {
    key: "sentiment", label: "Sentiment", value: "Positive — exec air-cover from CEO",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "23:55", quote: "Honestly, our CEO is the one pushing this. He saw a competitor demo and won't stop talking about it." },
  },
];

const TIMELINE_GROUPS = [
  {
    title: "Upcoming & Overdue",
    items: [
      { type: "task", title: "Send SOC 2 + sandbox access", when: "Due Apr 30", desc: "Promised on today's call. Owner: you." },
    ],
  },
  {
    title: "April 2026",
    items: [
      { type: "call", title: "Discovery — Pricing & Procurement", when: "Apr 28 · 24m", desc: "Confirmed Q2 timeline, Marcus Lee owns budget. Two objections raised." },
      { type: "email", title: "Re: Pulse demo follow-up", when: "Apr 21", desc: "Maya: 'Looped in Marcus. Let's do 30 min next week.'" },
      { type: "call", title: "Demo — Pulse review layer", when: "Apr 14 · 32m", desc: "Walked through Salesforce-native UI. Maya: 'This is exactly what we built and failed at.'" },
      { type: "note", title: "Pre-call brief", when: "Apr 14", desc: "Northwind tried building this internally — 18% adoption. CEO threatening to buy Gong." },
      { type: "call", title: "Intro — referred by Helix Bio", when: "Apr 03 · 18m", desc: "Maya, ex-Stripe RevOps. Burned by Salesforce 2023 rollout. Skeptical of new tools." },
    ],
  },
];

// ============================================================================
// Page
// ============================================================================

const Index = () => {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>(SEED_FIELDS);
  const [summary, setSummary] = useState(SEED_SUMMARY);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryReviewed, setSummaryReviewed] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<FieldKey>>(new Set());
  const [pathStep, setPathStep] = useState(2); // 0 Call Ended, 1 AI Drafted, 2 Ready, 3 Confirmed, 4 Synced
  const [synced, setSynced] = useState(false);
  const [syncedAgo, setSyncedAgo] = useState(0);
  const [showSync, setShowSync] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceDiff, setVoiceDiff] = useState<FieldKey[] | null>(null);
  const [amendment, setAmendment] = useState("");
  const [activeTab, setActiveTab] = useState<"review">("review");
  const recTimer = useRef<number | null>(null);

  const confirmedCount = fields.filter((f) => f.confirmed).length;

  useEffect(() => {
    if (confirmedCount === 7 && pathStep < 3) setPathStep(3);
  }, [confirmedCount, pathStep]);

  useEffect(() => {
    if (!synced) return;
    const t = window.setInterval(() => setSyncedAgo((s) => s + 1), 60000);
    return () => clearInterval(t);
  }, [synced]);

  const toggleConfirm = (k: FieldKey) => {
    setFields((arr) => arr.map((f) => (f.key === k ? { ...f, confirmed: !f.confirmed } : f)));
  };
  const confirmAll = () => {
    setSummaryReviewed(true);
    setFields((arr) => arr.map((f) => ({ ...f, confirmed: true })));
    setPathStep(3);
    toast.success("All 7 fields confirmed");
  };
  const toggleSource = (k: FieldKey) => {
    setExpandedSources((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

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
      setAmendment("Maya also mentioned wanting a reference customer in healthcare before the Marcus meeting.");
      toast("Voice amendment ready", { description: "Review the proposed changes — nothing applied yet." });
    }, 1400);
  };
  const applyVoice = () => {
    if (!voiceDiff) return;
    setFields((arr) =>
      arr.map((f) => {
        if (f.key === "next") return { ...f, value: f.value + " + healthcare reference customer", confirmed: false };
        if (f.key === "objections") return { ...f, value: f.value + " + needs healthcare proof point", confirmed: false };
        return f;
      })
    );
    setVoiceDiff(null);
    toast.success("Amendment applied to 2 fields");
  };

  const doSync = () => {
    // SyncModal handles its own progress; navigate to complete on finish
    setPathStep(4);
    setSynced(true);
    setSyncedAgo(0);
    setShowSync(false);
    navigate("/calls/complete/maya-chen");
  };

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
        <StatBanner onImport={() => setShowImport(true)} />

        <main className="flex-1 px-6 py-4 space-y-4">
          <RecordHeader synced={synced} syncedAgo={syncedAgo} onSync={() => setShowSync(true)} allConfirmed={confirmedCount === 7} confirmedCount={confirmedCount} />
          <SourceBanner />
          <PathBar step={pathStep} />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><AboutCard /></div>

            <div className="col-span-6 space-y-4">
              <CenterHeader
                summaryReviewed={summaryReviewed}
                synced={synced}
                confirmedCount={confirmedCount}
                onConfirmAll={confirmAll}
              />
              <SummaryBlock
                summary={summary}
                setSummary={setSummary}
                editing={editingSummary}
                setEditing={setEditingSummary}
                reviewed={summaryReviewed}
                setReviewed={setSummaryReviewed}
              />
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <FieldCard
                    key={f.key}
                    field={f}
                    position={i + 1}
                    total={fields.length}
                    expanded={expandedSources.has(f.key)}
                    onToggleSource={() => toggleSource(f.key)}
                    onConfirm={() => toggleConfirm(f.key)}
                    diff={voiceDiff?.includes(f.key)}
                  />
                ))}
              </div>
              <AmendmentInput
                amendment={amendment}
                setAmendment={setAmendment}
                recording={recording}
                recMs={recMs}
                transcribing={transcribing}
                onStart={startRecord}
                onStop={stopRecord}
                voiceDiff={voiceDiff}
                onApply={applyVoice}
                onDiscard={() => { setVoiceDiff(null); setAmendment(""); }}
              />
            </div>

            <div className="col-span-3 space-y-4">
              <ActivityTimeline />
              <PipelineReviewPreview synced={synced} />
            </div>
          </div>
        </main>

        <TodoFooter />
      </div>

      {recording && <FloatingRecChip ms={recMs} onStop={stopRecord} />}
      {showSync && <SyncModal onCancel={() => setShowSync(false)} onConfirm={doSync} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
};

export default Index;

// Shell components imported from @/components/pulse/Shell

// ============================================================================
// Stat banner
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

// ============================================================================
// Record header
// ============================================================================

function RecordHeader({ synced, syncedAgo, onSync, allConfirmed, confirmedCount }: { synced: boolean; syncedAgo: number; onSync: () => void; allConfirmed: boolean; confirmedCount: number }) {
  const syncDisabled = !synced && !allConfirmed;
  const tooltip = syncDisabled ? `Confirm all 7 fields below before syncing to Salesforce. (${confirmedCount} of 7 confirmed)` : "";
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
      <div className="flex items-center gap-2 shrink-0">
        <button className="h-8 px-3 text-[12px] border border-border rounded hover:bg-secondary">Skip for Now</button>
        <button className="h-8 px-3 text-[12px] border border-border rounded hover:bg-secondary">Save Draft</button>
        <span title={tooltip} className={cn(syncDisabled && "cursor-not-allowed")}>
          <button
            onClick={onSync}
            disabled={synced || syncDisabled}
            className="h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {synced ? "Synced" : "Confirm & Sync to Salesforce"}
          </button>
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Source banner + Path
// ============================================================================

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
                !done && !active && "bg-secondary text-muted-foreground"
              )}
            >
              {done && <Check className="w-3 h-3" />}
              {s}
            </div>
          );
        })}
      </div>
      <button className="ml-2 h-8 px-3 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 shrink-0">
        Mark Status as Complete
      </button>
    </div>
  );
}

// ============================================================================
// Left column — About this Call
// ============================================================================

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

// ============================================================================
// Center — Summary + fields + amendment
// ============================================================================

function CenterHeader({ summaryReviewed, synced, confirmedCount, onConfirmAll }: {
  summaryReviewed: boolean; synced: boolean; confirmedCount: number; onConfirmAll: () => void;
}) {
  const total = 7;
  const allConfirmed = confirmedCount === total;
  const remaining = total - confirmedCount;
  const pct = (confirmedCount / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-tight">
            Review &amp; Confirm <span className="text-muted-foreground font-normal">· {total} Fields from Your Call</span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Pulse drafted these from your Zoom call. Confirm each field is accurate, then sync to Salesforce.
          </div>
        </div>
        {allConfirmed ? (
          <span className="h-8 px-3 text-[12px] font-medium bg-success/10 text-success border border-success/30 rounded flex items-center gap-1.5 shrink-0">
            <Check className="w-3.5 h-3.5" /> All Fields Confirmed
          </span>
        ) : (
          <button
            onClick={onConfirmAll}
            className="h-8 px-3 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 shrink-0"
          >
            {confirmedCount === 0 ? "Confirm All Fields" : `Confirm Remaining (${remaining})`}
          </button>
        )}
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={cn("text-[11px] font-medium", allConfirmed ? "text-success" : "text-muted-foreground")}>
          {allConfirmed
            ? `Ready to sync · all ${total} fields confirmed`
            : `${confirmedCount} of ${total} confirmed`}
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
          reviewed && !editing && "border-l-4 border-l-success"
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

function FieldCard({ field, position, total, expanded, onToggleSource, onConfirm, diff }: {
  field: Field; position: number; total: number; expanded: boolean; onToggleSource: () => void; onConfirm: () => void; diff?: boolean;
}) {
  const dot = field.confidence === "high" ? "bg-success" : field.confidence === "med" ? "bg-warning" : "bg-destructive";
  const dotLabel = field.confidence === "high" ? "High confidence" : field.confidence === "med" ? "Medium confidence" : "Low confidence";
  return (
    <div
      className={cn(
        "bg-card border border-border rounded transition-all relative",
        field.confirmed && "border-l-4 border-l-success",
        diff && "ring-2 ring-primary/50 bg-accent/30"
      )}
    >
      <span
        className={cn(
          "absolute top-2 right-3 font-mono text-[10px] tabular-nums",
          field.confirmed ? "text-success" : "text-muted-foreground"
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
            {!field.confirmed && !diff && (
              <span className="text-[10px] font-bold text-warning-foreground bg-[#FFF7E6] border border-warning/40 px-1.5 py-0.5 rounded">Draft</span>
            )}
            {diff && (
              <span className="text-[10px] font-bold text-primary bg-accent border border-primary/30 px-1.5 py-0.5 rounded">Voice update</span>
            )}
          </div>
          <div className="text-[14px] text-foreground mt-1">{field.value}</div>
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
        <button
          onClick={onConfirm}
          className={cn(
            "h-7 px-3 text-[11px] font-medium rounded shrink-0 border",
            field.confirmed
              ? "bg-success text-success-foreground border-success"
              : "border-primary text-primary hover:bg-primary/5"
          )}
        >
          {field.confirmed ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Confirmed</span> : "Confirm"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Amendment input
// ============================================================================

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
              : "border-primary text-primary hover:bg-primary/5"
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

// ============================================================================
// Right column — Activity timeline + Pipeline preview
// ============================================================================

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
              f.active ? "border-primary text-primary bg-accent" : "border-border text-muted-foreground hover:bg-secondary"
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
              <TimelineItem key={idx} {...it} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ type, title, when, desc }: { type: string; title: string; when: string; desc: string }) {
  const cfg: Record<string, { I: any; color: string }> = {
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

// ============================================================================
// To Do footer
// ============================================================================

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

// ============================================================================
// Modals
// ============================================================================

function SyncModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [showLineage, setShowLineage] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepState, setStepState] = useState<0 | 1 | 2 | 3>(0); // sync row currently in progress
  const [simulateError, setSimulateError] = useState(false);
  const [errored, setErrored] = useState(false);

  const SYNC_STEPS = [
    { label: "Validating field permissions...", done: "Field permissions validated", ms: 400 },
    { label: "Writing 7 fields to Maya Chen's record...", done: "7 fields written to Maya Chen's record", ms: 800 },
    { label: "Logging activity to pipeline...", done: "Activity logged to pipeline", ms: 600 },
  ];

  const ORIGINAL = [
    { key: "outcome", label: "Call outcome", value: "Qualified — moving to security review" },
    { key: "next", label: "Next step", value: "Send SOC 2 + sandbox access by Fri Apr 30" },
    { key: "dm", label: "Decision maker", value: "Marcus Lee (CFO) — budget; Maya — technical" },
    { key: "budget", label: "Budget signal", value: "$60–80K ACV envelope confirmed" },
    { key: "timeline", label: "Timeline", value: "Q2 2026 implementation; 60-day procurement" },
    { key: "objections", label: "Objections", value: "SSO/audit logs + Pipedrive migration" },
    { key: "sentiment", label: "Sentiment", value: "Positive — exec air-cover from CEO" },
  ];

  type Row = { key: string; label: string; value: string; original: string; edited: boolean };
  const [rows, setRows] = useState<Row[]>(
    ORIGINAL.map((f) => ({ ...f, original: f.value, edited: false }))
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const editedCount = rows.filter((r) => r.edited).length;

  const startEdit = (r: Row) => {
    setEditingKey(r.key);
    setDraft(r.value);
  };
  const saveEdit = () => {
    if (!editingKey) return;
    setRows((arr) =>
      arr.map((r) =>
        r.key === editingKey
          ? { ...r, value: draft.trim() || r.value, edited: (draft.trim() || r.value) !== r.original }
          : r
      )
    );
    setEditingKey(null);
  };
  const revert = (key: string) => {
    setRows((arr) => arr.map((r) => (r.key === key ? { ...r, value: r.original, edited: false } : r)));
  };

  // Stepped sync animation: each row resolves in sequence; progress bar fills smoothly across all rows.
  useEffect(() => {
    if (!syncing || errored) return;
    const totalMs = SYNC_STEPS.reduce((a, s) => a + s.ms, 0);
    const cumulative = [SYNC_STEPS[0].ms, SYNC_STEPS[0].ms + SYNC_STEPS[1].ms, totalMs];
    const start = Date.now();
    const i = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      // simulated failure on writing fields step
      if (simulateError && elapsed >= SYNC_STEPS[0].ms + 200) {
        setErrored(true);
        window.clearInterval(i);
        return;
      }
      if (elapsed >= cumulative[2]) {
        setStepState(3);
        window.clearInterval(i);
        window.setTimeout(onConfirm, 250);
      } else if (elapsed >= cumulative[1]) setStepState(2);
      else if (elapsed >= cumulative[0]) setStepState(1);
    }, 50);
    return () => window.clearInterval(i);
  }, [syncing, errored, simulateError, onConfirm]);

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
              Review and edit if needed. 7 fields, 1 summary, and 1 voice note will be added to Maya Chen's contact record.
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
                      done ? "border-success/40 bg-success/5" : "border-border bg-card"
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
                  7
                  {editedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning/10 border border-warning/40 px-1.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" /> {editedCount} edited
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium">Fields</div>
                <div className="text-[10px] text-muted-foreground">confirmed</div>
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
                          f.edited && "border-l-2 border-l-warning"
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

function ImportModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"paste" | "upload" | "connect">("paste");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!processing) return;
    const t = window.setInterval(() => setProgress((p) => Math.min(100, p + 8)), 120);
    return () => clearInterval(t);
  }, [processing]);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        onClose();
        toast.success("Transcript processed", { description: "Drafted from your imported transcript." });
      }, 400);
    }
  }, [progress, onClose]);

  const sources = [
    { name: "Zoom", connected: true },
    { name: "Teams", connected: false },
    { name: "Google Meet", connected: false },
    { name: "Granola", connected: false },
    { name: "Otter", connected: false },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4 py-8">
      <div className="bg-card border border-border rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-[15px]">Import Call Transcript</div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
        </div>

        {processing ? (
          <div className="p-8 text-center">
            <div className="text-[13px] mb-3">Processing transcript…</div>
            <div className="w-full h-1.5 bg-secondary rounded overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Extracting entities · summarizing · drafting fields</div>
          </div>
        ) : (
          <>
            <div className="p-4 grid grid-cols-3 gap-2">
              {[
                { k: "paste", I: FileText, label: "Paste Transcript" },
                { k: "upload", I: FileUp, label: "Upload File" },
                { k: "connect", I: Plug, label: "Connect Source" },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setTab(o.k as any)}
                  className={cn(
                    "border rounded p-3 text-left text-[12px] transition-colors",
                    tab === o.k ? "border-primary bg-accent" : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <o.I className={cn("w-4 h-4 mb-1.5", tab === o.k ? "text-primary" : "text-muted-foreground")} />
                  <div className="font-medium">{o.label}</div>
                </button>
              ))}
            </div>

            <div className="px-4 pb-4">
              {tab === "paste" && (
                <div>
                  <textarea
                    placeholder="Paste your transcript here…"
                    className="w-full min-h-[160px] border border-border rounded p-2 text-[12px] outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="text-[11px] text-muted-foreground mt-1">Works with Google Meet exports, Otter, Granola, or any plain-text transcript.</div>
                </div>
              )}
              {tab === "upload" && (
                <div className="border-2 border-dashed border-border hover:border-primary rounded p-8 text-center text-[12px] text-muted-foreground">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-primary" />
                  Drag a file here, or <a className="text-primary font-medium cursor-pointer hover:underline">Browse files</a>
                  <div className="text-[10px] mt-1">.txt · .vtt · .srt · .docx</div>
                </div>
              )}
              {tab === "connect" && (
                <div className="grid grid-cols-3 gap-2">
                  {sources.map((s) => (
                    <div key={s.name} className="border border-border rounded p-3 text-center">
                      <div className="text-[12px] font-medium mb-2">{s.name}</div>
                      {s.connected ? (
                        <div className="text-[11px] text-success flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Connected</div>
                      ) : (
                        <button className="h-7 px-2 text-[11px] border border-primary text-primary rounded hover:bg-primary/5">Connect</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <Lookup label="Match to contact" placeholder="Search contacts…" />
                <Lookup label="Match to deal" placeholder="Optional" />
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Date of call</div>
                  <div className="relative">
                    <input type="date" className="w-full h-8 px-2 pr-7 text-[12px] border border-border rounded outline-none focus:ring-1 focus:ring-primary" />
                    <Calendar className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={onClose} className="h-8 px-3 text-[12px] border border-border rounded hover:bg-secondary">Cancel</button>
              <button
                onClick={() => setProcessing(true)}
                className="h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Process Transcript
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Lookup({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="relative">
        <input placeholder={placeholder} className="w-full h-8 px-2 pr-7 text-[12px] border border-border rounded outline-none focus:ring-1 focus:ring-primary" />
        <Search className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
