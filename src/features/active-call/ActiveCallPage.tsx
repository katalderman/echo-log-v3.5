import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, Video, MicOff, ChevronDown, ChevronRight, Check, FileText, Sparkles, Zap,
  Lightbulb, AlertTriangle, RefreshCw,
} from "lucide-react";
import { NavRail, TopBar, BreadcrumbTabs } from "@/components/shell/Shell";
import { StateControls, Skeleton, ScreenState } from "@/components/shell/StateControls";
import { cn } from "@/lib/utils";
import { useCall, useCallBrief, useCallSession } from "@/lib/queries";

const STEPS = ["Call In Progress", "Call Ended", "AI Drafting", "Ready for Review", "Confirmed", "Synced"];

// The prototype's /calls/active route shows a single mocked live call.
// Slug is fixed for now; real apps would resolve this from a router param.
const ACTIVE_CALL_SLUG = "maya-chen";

function useTick(intervalMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
}

export default function ActiveCallPage() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [muted, setMuted] = useState(false);
  const [stateOverride, setStateOverride] = useState<ScreenState | "auto">("auto");
  const [showQuickNote, setShowQuickNote] = useState(false);

  // Re-render every second so the elapsed/lost-connection timers stay live.
  useTick(1000);

  const callQuery = useCall(ACTIVE_CALL_SLUG);
  const call = callQuery.data ?? null;
  const briefQuery = useCallBrief(call?.id);
  const sessionQuery = useCallSession(call?.id);

  const isLoading = callQuery.isLoading || briefQuery.isLoading || sessionQuery.isLoading;
  const isError = callQuery.isError || briefQuery.isError || sessionQuery.isError;

  // Brief panel state mirrors the StateControls toggle so the demo still works,
  // while real loading/error states are derived from the queries.
  const briefState: ScreenState =
    stateOverride !== "auto"
      ? stateOverride
      : isLoading
      ? "loading"
      : isError
      ? "error"
      : !briefQuery.data
      ? "empty"
      : "normal";

  const session = sessionQuery.data;
  const brief = briefQuery.data;
  const zoomDropped = briefState === "error" || session?.status === "dropped";

  // Elapsed: now - session.started_at (clamped to 0).
  const elapsed = useMemo(() => {
    if (!session?.started_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000));
  }, [session?.started_at, Date.now()]);

  const secondsSinceDrop = useMemo(() => {
    if (!session?.connection_lost_at) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(session.connection_lost_at).getTime()) / 1000));
  }, [session?.connection_lost_at, Date.now()]);

  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toString().padStart(2, "0");
  const platform = session?.platform ?? "Zoom";
  const talkingPoints: string[] = Array.isArray(brief?.talking_points)
    ? (brief!.talking_points as unknown[]).filter((p): p is string => typeof p === "string")
    : [];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <BreadcrumbTabs
          crumbs={[{ label: "Calls", to: "/" }, { label: "Active Call" }]}
          tab={{ label: call ? `${call.contact_name} — ${call.company}` : "Active Call", closable: false }}
          tabIcon={Phone}
        />

        <main className="flex-1 px-6 py-4 space-y-4">
          <div className="flex justify-end">
            <StateControls
              value={stateOverride === "auto" ? "normal" : stateOverride}
              onChange={(v) => setStateOverride(v as ScreenState)}
            />
          </div>

          {/* Record header */}
          <div className="bg-card border border-border rounded p-4 flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-full grid place-items-center shrink-0 relative",
              zoomDropped ? "bg-warning" : "bg-teal"
            )}>
              <Phone className="w-5 h-5 text-white" />
              <span className={cn(
                "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                zoomDropped ? "bg-warning" : "bg-teal animate-pulse"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1.5"
                style={{ color: zoomDropped ? "hsl(var(--warning))" : "hsl(var(--teal))" }}
              >
                <span className={cn("w-2 h-2 rounded-full", zoomDropped ? "bg-warning" : "bg-teal animate-pulse")} />
                {zoomDropped ? `Active Call · ${platform} Disconnected` : `Active Call · Connected to ${platform}`}
              </div>
              <div className="text-[22px] font-semibold leading-tight">{call?.contact_name ?? "—"}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                Live {platform} call · started {Math.floor(elapsed / 60)} min ago · elapsed {mins}:{secs}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setMuted((v) => !v)}
                className={cn(
                  "h-8 px-3 text-[12px] border rounded flex items-center gap-1.5",
                  muted ? "bg-secondary border-border text-muted-foreground" : "border-border hover:bg-secondary"
                )}
              >
                <MicOff className="w-3.5 h-3.5" /> {muted ? "Pulse Muted" : "Mute Pulse"}
              </button>
              <button
                onClick={() => navigate("/")}
                className="h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                End Call & Review
              </button>
            </div>
          </div>

          {/* Source-of-truth banner OR Zoom-drop warning strip */}
          {zoomDropped ? (
            <div className="bg-warning/10 border border-l-4 border-l-warning border-warning/40 rounded px-4 py-2.5 flex items-center gap-4 text-[12px]">
              <div className="flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="font-semibold">
                  Lost connection to {platform} {secondsSinceDrop !== null ? `${secondsSinceDrop} seconds` : "moments"} ago.
                </span>
              </div>
              <div className="flex-1 text-muted-foreground">
                Pulse will resume drafting when reconnected. Your in-call notes are saved locally.
              </div>
              <button
                onClick={() => { setStateOverride("auto"); sessionQuery.refetch(); }}
                className="text-primary font-medium hover:underline shrink-0 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry connection
              </button>
            </div>
          ) : (
            <div className="bg-info border border-info-border rounded px-4 py-2.5 flex items-center gap-4 text-[12px]">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 rounded bg-[#2D8CFF] grid place-items-center"><Video className="w-3 h-3 text-white" /></div>
                <span className="font-semibold">Connected to your {platform} call · started {Math.floor(elapsed / 60)} min ago</span>
              </div>
              <div className="flex-1 text-muted-foreground">
                Pulse will draft fields after the call ends. Nothing is being written to Salesforce yet.
              </div>
              <a className="text-primary font-medium hover:underline shrink-0 cursor-pointer">Pause</a>
            </div>
          )}

          {/* Path */}
          <div className="bg-card border border-border rounded p-2 flex items-center gap-1">
            <div className="flex-1 flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-9 px-4 -ml-2 first:ml-0 flex items-center justify-center text-[11px] font-medium gap-1.5 flex-1",
                    i === 0 ? "path-chevron-first" : i === STEPS.length - 1 ? "path-chevron-last" : "path-chevron",
                    i === 0 && "bg-teal text-white animate-pulse",
                    i > 0 && "bg-secondary text-muted-foreground"
                  )}
                >
                  {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* Left: About this Call (read-only context) */}
            <div className="col-span-3">
              <AboutCard
                contactName={call?.contact_name}
                title={call?.title}
                company={call?.company}
                email={call?.email}
                amount={call?.amount_cents}
                platform={platform}
                startedAt={session?.started_at}
                elapsedMin={Math.floor(elapsed / 60)}
              />
            </div>

            {/* Center: Pre-Call Brief + What Pulse captures */}
            <div className="col-span-6 space-y-4">
              <div>
                <div className="text-[13px] font-semibold flex items-center gap-2">
                  Pre-Call Brief
                  <span className="text-[10px] font-bold text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded">
                    READ-ONLY DURING CALL
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Glance reference. Pulse is listening — you don't need to take field notes.</div>
              </div>

              {briefState === "loading" ? (
                <div className="bg-card border border-border rounded">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={cn("px-4 py-3", i < 2 && "border-b border-border")}>
                      <Skeleton className="h-2.5 w-32 mb-2" />
                      <Skeleton className="h-3 w-full mb-1.5" />
                      <Skeleton className="h-3 w-[92%] mb-1.5" />
                      <Skeleton className="h-3 w-[78%]" />
                    </div>
                  ))}
                </div>
              ) : briefState === "empty" ? (
                <div className="bg-card border border-border rounded px-6 py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-info border border-info-border grid place-items-center mx-auto mb-3">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-[13px] font-medium max-w-sm mx-auto leading-relaxed">
                    No history with this contact yet. Pulse will draft full notes after the call ends — for now, just focus on the conversation.
                  </div>
                  <button
                    onClick={() => setShowQuickNote(true)}
                    className="mt-3 text-[12px] text-primary hover:underline font-medium"
                  >
                    Add quick note
                  </button>
                </div>
              ) : (
                <div className="bg-card border border-border rounded">
                  {brief?.account_context && (
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Account context</div>
                      <div className="text-[13px] mt-1 leading-relaxed">{brief.account_context}</div>
                    </div>
                  )}
                  {brief?.last_touchpoint && (
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Last touchpoint</div>
                      <div className="text-[13px] mt-1 leading-relaxed">{brief.last_touchpoint}</div>
                    </div>
                  )}
                  {talkingPoints.length > 0 && (
                    <div className="px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Talking points</div>
                      <ul className="text-[13px] space-y-1.5 leading-relaxed list-disc pl-5">
                        {talkingPoints.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* What Pulse captures */}
              <div className="bg-info border border-info-border rounded p-3">
                <div className="text-[12px] font-semibold flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> What Pulse captures
                </div>
                <div className="space-y-1.5">
                  {[
                    { I: FileText, label: "Full transcript", status: "Recording now ✓" },
                    { I: Sparkles, label: "AI summary", status: "Will be drafted after call ends" },
                    { I: Zap, label: "7 CRM fields, pre-filled", status: "Will be ready for review after call ends" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2 text-[12px] bg-card border border-border rounded px-3 py-2">
                      <r.I className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium flex-1">{r.label}</span>
                      <span className="text-[11px] text-muted-foreground">{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Talking Points + Quick Note */}
            <div className="col-span-3 space-y-4">
              <div className="bg-card border border-border rounded text-[12px]">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[13px] font-semibold">Live Talking Points</div>
                  <div className="text-[10px] text-muted-foreground">Your pre-call notes, ready to glance.</div>
                </div>
                {briefState === "loading" ? (
                  <div className="p-3 space-y-2">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-3 w-full" />)}
                  </div>
                ) : talkingPoints.length === 0 ? (
                  <div className="p-3 text-[11px] text-muted-foreground">No talking points for this call yet.</div>
                ) : (
                  <ul className="p-3 space-y-2">
                    {talkingPoints.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                        <span className="leading-snug">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-card border border-border rounded">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-[13px]">Quick Note</span>
                  <span className="text-[10px] text-muted-foreground">Attaches to draft</span>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Jot a live observation — Pulse will attach it to the draft when the call ends."
                  className="w-full px-3 py-2 text-[12px] min-h-[100px] bg-transparent outline-none resize-none"
                />
                <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>{note.length} chars · saved locally</span>
                  <span className="flex items-center gap-1 text-success"><Check className="w-3 h-3" /> Auto-saved</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="h-9 bg-[#3E3E3C] text-white border-t border-border flex items-center px-4 text-[12px]">
          <span className="font-medium">To Do List</span>
          <span className="ml-2 text-white/60">(3)</span>
        </div>
      </div>
    </div>
  );
}

function AboutCard({
  contactName, title, company, email, amount, platform, startedAt, elapsedMin,
}: {
  contactName?: string | null;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  amount?: number | null;
  platform: string;
  startedAt?: string | null;
  elapsedMin: number;
}) {
  const startedLabel = startedAt
    ? new Date(startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "—";
  const amountLabel = amount != null ? `$${Math.round(amount / 100).toLocaleString()}` : "—";
  return (
    <div className="bg-card border border-border rounded text-[12px]">
      <div className="px-3 py-2 border-b border-border font-semibold text-[13px]">About this Call</div>
      <Section title="Meeting Source" defaultOpen>
        <Row label="Platform" value={<span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-[#2D8CFF]" /> {platform}</span>} />
        <Row label="Status" value={<span className="text-teal flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" /> Live</span>} />
        <Row label="Started" value={`${startedLabel} (${elapsedMin} min ago)`} />
        <Row label="Recording" value="In progress" />
      </Section>
      <Section title="Contact Details" defaultOpen>
        <Row label="Name" value={contactName ?? "—"} />
        <Row label="Title" value={title ?? "—"} />
        <Row label="Email" value={email ?? "—"} />
      </Section>
      <Section title="Deal Context">
        <Row label="Account" value={company ?? "—"} />
        <Row label="Stage" value="Qualification" />
        <Row label="Amount" value={amountLabel} />
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
