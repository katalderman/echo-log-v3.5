import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Phone, CheckCircle2, Check, ExternalLink, Video, Quote, ChevronDown, ChevronRight,
  ArrowLeft, ArrowRight, Sparkles, AlertTriangle, RefreshCw,
} from "lucide-react";
import { NavRail, TopBar, BreadcrumbTabs } from "@/components/pulse/Shell";
import { StateControls, Skeleton, ScreenState } from "@/components/pulse/StateControls";
import { cn } from "@/lib/utils";
import { CONFIRMED_FIELDS, REVIEW_QUEUE, PREVIOUS_CALLS } from "@/data/calls";

const STEPS = ["Call Ended", "AI Drafted", "Ready for Review", "Fields Confirmed", "Synced to Salesforce"];

export default function Complete() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [secAgo, setSecAgo] = useState(2);
  const [pipelineState, setPipelineState] = useState<ScreenState>("loading");
  const [queueState, setQueueState] = useState<ScreenState>("normal");
  const [verifyState, setVerifyState] = useState<ScreenState>("normal");

  // pipeline-push skeleton resolves to live in 1s
  useEffect(() => {
    if (pipelineState !== "loading") return;
    const t = window.setTimeout(() => setPipelineState("normal"), 1000);
    return () => clearTimeout(t);
  }, [pipelineState]);

  // history mode if id matches a previous call
  const previous = PREVIOUS_CALLS.find((c) => c.id === id);
  const isHistory = !!previous;
  const contact = previous?.contact || "Maya Chen";
  const company = previous?.company || "Northwind Robotics";

  const queueRest = REVIEW_QUEUE.filter((c) => c.id !== "maya-chen").slice(0, 3);
  const nextCall = queueRest[0];

  const [drafts, setDrafts] = useState<Array<{ id: string; contact: string; company: string; duration: string; date: string; fieldsConfirmed: number; fieldsTotal: number }>>([]);
  const [syncedPayload, setSyncedPayload] = useState<{
    summary?: string;
    syncedFields?: { key: string; label: string; value: string; edited?: boolean; original?: string; source: string }[];
    skippedFields?: { key: string; label: string; value: string }[];
  } | null>(null);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("pulse:drafts") || "[]");
      setDrafts(stored);
    } catch {
      setDrafts([]);
    }
    if (!isHistory) {
      try {
        const raw = localStorage.getItem("pulse:synced:maya-chen");
        if (raw) setSyncedPayload(JSON.parse(raw));
      } catch {}
    }
  }, [isHistory]);

  // Use what was actually synced when available; otherwise fall back to the canned data
  const displayedFields = syncedPayload?.syncedFields?.length
    ? syncedPayload.syncedFields.map((f) => ({ label: f.label, value: f.value, source: f.source, edited: f.edited }))
    : CONFIRMED_FIELDS.map((f) => ({ ...f, edited: false }));
  const skippedFields = syncedPayload?.skippedFields ?? [];
  const displayedSummary = syncedPayload?.summary;
  const fieldCount = displayedFields.length;

  useEffect(() => {
    if (isHistory) return;
    const t = setInterval(() => setSecAgo((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isHistory]);

  const syncedLabel = isHistory ? `Synced ${previous?.syncedAt}` : (secAgo < 60 ? `${secAgo} seconds ago` : `${Math.floor(secAgo / 60)} min ago`);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <BreadcrumbTabs
          crumbs={isHistory
            ? [{ label: "Calls", to: "/" }, { label: "Previous Reviews", to: "/calls/history" }, { label: contact }]
            : [{ label: "Calls", to: "/" }, { label: "Synced" }]}
          tab={{ label: `${contact} — ${company}`, closable: !isHistory }}
          tabIcon={Phone}
          onCloseTab={() => navigate("/")}
        />

        <main className="flex-1 px-6 py-4 space-y-4">
          {!isHistory && (
            <div className="flex justify-end gap-2 flex-wrap">
              <StateControls
                value={pipelineState}
                onChange={setPipelineState}
                label="Pipeline push"
                options={["loading", "normal"]}
                optionLabels={{ loading: "Loading", normal: "Live" }}
              />
              <StateControls
                value={queueState}
                onChange={setQueueState}
                label="Review queue"
                options={["normal", "empty"]}
                optionLabels={{ normal: "3 calls", empty: "Empty" }}
              />
              <StateControls
                value={verifyState}
                onChange={setVerifyState}
                label="Verification"
                options={["normal", "error"]}
                optionLabels={{ normal: "OK", error: "Timeout" }}
              />
            </div>
          )}
          {/* Record header — success state */}
          <div className="bg-card border border-border rounded p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success grid place-items-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1.5 text-success">
                <Check className="w-3 h-3" /> Synced to Salesforce · {syncedLabel}
              </div>
              <div className="text-[22px] font-semibold leading-tight">{contact}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {isHistory ? "Read-only history view." : "All fields written. Activity logged. Manager forecast updated."}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isHistory ? (
                <a className="h-8 px-3 text-[12px] border border-border rounded hover:bg-secondary flex items-center gap-1.5 cursor-pointer">
                  <ExternalLink className="w-3.5 h-3.5" /> View in Salesforce
                </a>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/")}
                    className="h-8 px-3 text-[12px] border border-border rounded hover:bg-secondary flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
                  </button>
                  <button
                    onClick={() => nextCall && navigate(`/`)}
                    className="h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1.5"
                  >
                    Review Next Call <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Path — all done */}
          <div className="bg-card border border-border rounded p-2 flex items-center gap-1">
            <div className="flex-1 flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-9 px-4 -ml-2 first:ml-0 flex items-center justify-center text-[11px] font-medium gap-1.5 flex-1",
                    i === 0 ? "path-chevron-first" : i === STEPS.length - 1 ? "path-chevron-last" : "path-chevron",
                    i < STEPS.length - 1 ? "bg-success/15 text-success" : "bg-success text-white"
                  )}
                >
                  <Check className="w-3 h-3" />
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Hero stat strip */}
          {!isHistory && (
            <div className="grid grid-cols-3 gap-3">
              <Stat value="7/7" label="Fields Confirmed" sub="Without amendments" />
              <Stat value="22s" label="Review Time" sub="vs 4.5min manual" highlight />
              <Stat value="4m 8s" label="Saved vs. manual" sub="Compounds across the team" />
            </div>
          )}

          {/* Verification timeout — observability gap, not a transaction failure */}
          {!isHistory && verifyState === "error" && (
            <div className="bg-warning/10 border border-l-4 border-l-warning border-warning/40 rounded px-4 py-2.5 flex items-center gap-4 text-[12px]">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Synced, but verification timed out.</span>
                <span className="text-muted-foreground"> Open the contact in Salesforce to confirm fields landed correctly.</span>
              </div>
              <a className="text-primary font-medium hover:underline shrink-0 flex items-center gap-1 cursor-pointer">
                Open in Salesforce <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            {/* Left: About */}
            <div className="col-span-3">
              <AboutCard />
            </div>

            {/* Center */}
            <div className="col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold flex items-center gap-2">
                    What Just Synced
                    <span className="text-[10px] font-bold text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded">
                      ✓ READ-ONLY
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">7 fields written to Maya Chen's contact record.</div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-card border border-l-4 border-l-success border-border rounded p-3">
                <div className="flex items-start gap-2">
                  <Quote className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Maya Chen evaluating Pulse to replace stalled internal CRM tool. CFO Marcus Lee owns budget; Maya holds technical sign-off. Q2 implementation, 60-day procurement. Open objections: SSO/audit, Pipedrive migration. Sentiment positive.
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border flex items-center gap-1">
                  <Video className="w-3 h-3" /> Generated from a 24-minute Zoom call · summary synced
                </div>
              </div>

              {/* Read-only fields */}
              <div className="space-y-2">
                {CONFIRMED_FIELDS.map((f) => (
                  <div key={f.label} className="bg-card border border-l-4 border-l-success border-border rounded p-3 opacity-95">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</span>
                          <span className="text-[10px] bg-success/10 border border-success/30 text-success font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Synced
                          </span>
                        </div>
                        <div className="text-[14px] mt-1">{f.value}</div>
                        <div className="text-[11px] text-muted-foreground mt-1.5 italic">— {f.source}</div>
                      </div>
                      <a className="text-muted-foreground hover:text-primary p-1 cursor-pointer" title="View in Salesforce">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Team queue nudge */}
              {!isHistory && queueState === "empty" ? (
                <div className="bg-card border border-l-4 border-l-success border-border rounded p-5 text-center">
                  <div className="w-9 h-9 rounded-full bg-success/10 border border-success/30 grid place-items-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div className="text-[13px] font-semibold">You're all caught up.</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">0 calls awaiting review. Your pipeline data is current.</div>
                  <button
                    onClick={() => navigate("/calls/history")}
                    className="mt-3 text-[12px] text-primary hover:underline font-medium"
                  >
                    Browse previous calls
                  </button>
                </div>
              ) : !isHistory && (
                <div className="bg-card border border-border rounded">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <div className="text-[13px] font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Your team's review queue
                    </div>
                    <span className="text-[11px] text-muted-foreground">{drafts.length + queueRest.length} calls waiting{drafts.length > 0 ? ` · ${drafts.length} draft${drafts.length === 1 ? "" : "s"}` : " · ~66s total"}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {drafts.map((d) => (
                      <div key={`draft-${d.id}`} className="px-3 py-2.5 flex items-center gap-3 hover:bg-secondary/40 bg-warning/5">
                        <div className="w-7 h-7 rounded-full bg-warning/20 border border-warning/40 grid place-items-center shrink-0">
                          <Phone className="w-3.5 h-3.5 text-warning-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{d.contact} <span className="text-muted-foreground font-normal">— {d.company}</span></div>
                          <div className="text-[11px] text-muted-foreground">{d.duration} · {d.date}</div>
                        </div>
                        <span className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[#FFF7E6] text-warning-foreground border border-warning/40 flex items-center">
                          Draft · {d.fieldsConfirmed} of {d.fieldsTotal} confirmed
                        </span>
                        <button
                          onClick={() => navigate("/")}
                          className="h-7 px-3 text-[11px] font-medium border border-primary text-primary rounded hover:bg-primary/5"
                        >
                          Resume
                        </button>
                      </div>
                    ))}
                    {queueRest.map((c) => (
                      <div key={c.id} className="px-3 py-2.5 flex items-center gap-3 hover:bg-secondary/40">
                        <div className="w-7 h-7 rounded-full bg-teal grid place-items-center shrink-0">
                          <Phone className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{c.contact} <span className="text-muted-foreground font-normal">— {c.company}</span></div>
                          <div className="text-[11px] text-muted-foreground">{c.duration} · {c.date}</div>
                        </div>
                        <button
                          onClick={() => navigate("/")}
                          className="h-7 px-3 text-[11px] font-medium border border-primary text-primary rounded hover:bg-primary/5"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Pipeline preview */}
            <div className="col-span-3 space-y-4">
              {pipelineState === "loading" && !isHistory ? (
                <div className="bg-card border border-border rounded text-[12px]">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="text-[13px] font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Pushing to manager dashboard…
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Field summary going live.</div>
                  </div>
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="border-t border-border pt-2 mt-2 space-y-1.5">
                      <Skeleton className="h-2.5 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-[88%]" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded text-[12px]">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold">Pipeline Review Preview</span>
                      <span className="text-[10px] font-bold text-success bg-success/10 border border-success/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                        ✓ LIVE IN MANAGER DASHBOARD
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Live in Manager Dashboard.</div>
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
                    <div className="bg-info border border-info-border rounded px-2 py-1.5 text-[10px] text-primary mt-2 flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> Pushed to team's pipeline view
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ value, label, sub, highlight }: { value: string; label: string; sub: string; highlight?: boolean }) {
  return (
    <div className="bg-card border border-border rounded px-4 py-3">
      <div className={cn("text-[28px] font-semibold leading-tight num", highlight && "text-success")}>{value}</div>
      <div className="text-[12px] font-medium mt-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function AboutCard() {
  return (
    <div className="bg-card border border-border rounded text-[12px]">
      <div className="px-3 py-2 border-b border-border font-semibold text-[13px]">About this Call</div>
      <Section title="Meeting Source" defaultOpen>
        <Row label="Platform" value={<span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-[#2D8CFF]" /> Zoom Meeting</span>} />
        <Row label="Status" value={<span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Synced</span>} />
        <Row label="Duration" value="24m 18s" />
        <Row label="Date / Time" value="Apr 28, 2026 · 2:00 PM" />
      </Section>
      <Section title="Contact Details">
        <Row label="Name" value="Maya Chen" />
        <Row label="Title" value="Director of RevOps" />
        <Row label="Email" value="maya@northwind-robotics.io" />
      </Section>
      <Section title="Deal Context">
        <Row label="Account" value="Northwind Robotics" />
        <Row label="Stage" value="Qualification" />
        <Row label="Amount" value="$72,000" />
        <Row label="Close Date" value="Jun 30, 2026" />
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-[12px] text-foreground">{value}</div>
      </div>
    </div>
  );
}
