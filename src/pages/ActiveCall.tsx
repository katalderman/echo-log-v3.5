import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, Video, MicOff, ChevronDown, ChevronRight, Check, FileText, Sparkles, Zap,
  Lightbulb, AlertTriangle, RefreshCw,
} from "lucide-react";
import { NavRail, TopBar, BreadcrumbTabs } from "@/components/pulse/Shell";
import { StateControls, Skeleton, ScreenState } from "@/components/pulse/StateControls";
import { cn } from "@/lib/utils";

const STEPS = ["Call In Progress", "Call Ended", "AI Drafting", "Ready for Review", "Confirmed", "Synced"];

export default function ActiveCall() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(8 * 60);
  const [note, setNote] = useState("");
  const [muted, setMuted] = useState(false);
  const [briefState, setBriefState] = useState<ScreenState>("loading");
  const [showQuickNote, setShowQuickNote] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Loading state must hold for at least 600ms even if "fetch" is instant.
  useEffect(() => {
    if (briefState !== "loading") return;
    const t = window.setTimeout(() => setBriefState("normal"), 900);
    return () => clearTimeout(t);
  }, [briefState]);

  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toString().padStart(2, "0");
  const zoomDropped = briefState === "error";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <BreadcrumbTabs
          crumbs={[{ label: "Calls", to: "/" }, { label: "Active Call" }]}
          tab={{ label: "Maya Chen — Northwind Robotics", closable: false }}
          tabIcon={Phone}
        />

        <main className="flex-1 px-6 py-4 space-y-4">
          {/* Record header */}
          <div className="bg-card border border-border rounded p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal grid place-items-center shrink-0 relative">
              <Phone className="w-5 h-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal border-2 border-card animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1.5" style={{ color: "hsl(var(--teal))" }}>
                <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                Active Call · Connected to Zoom
              </div>
              <div className="text-[22px] font-semibold leading-tight">Maya Chen</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                Live Zoom call · started {Math.floor(elapsed / 60)} min ago · elapsed {mins}:{secs}
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

          {/* Source-of-truth banner */}
          <div className="bg-info border border-info-border rounded px-4 py-2.5 flex items-center gap-4 text-[12px]">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-5 h-5 rounded bg-[#2D8CFF] grid place-items-center"><Video className="w-3 h-3 text-white" /></div>
              <span className="font-semibold">Connected to your Zoom call · started 8 min ago</span>
            </div>
            <div className="flex-1 text-muted-foreground">
              Pulse will draft fields after the call ends. Nothing is being written to Salesforce yet.
            </div>
            <a className="text-primary font-medium hover:underline shrink-0 cursor-pointer">Pause</a>
          </div>

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
              <AboutCard />
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

              <div className="bg-card border border-border rounded">
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Account context</div>
                  <div className="text-[13px] mt-1 leading-relaxed">
                    Northwind Robotics tried building this internally — 18% adoption, $2M sunk. CEO threatening to buy Gong. Maya owns the technical decision; Marcus Lee (CFO) signs anything {">"} $50K.
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Last touchpoint</div>
                  <div className="text-[13px] mt-1 leading-relaxed">
                    Demo on Apr 14 (32m). Maya: <span className="italic">"This is exactly what we built and failed at."</span> Asked for SSO/audit and Pipedrive migration details on follow-up.
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Talking points</div>
                  <ul className="text-[13px] space-y-1.5 leading-relaxed list-disc pl-5">
                    <li>SOC 2 Type II + audit log capabilities (kill objection #1)</li>
                    <li>Pipedrive → Salesforce migration tooling demo (kill objection #2)</li>
                    <li>Q2 implementation timeline confirmation + procurement path through Marcus</li>
                  </ul>
                </div>
              </div>

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
                <ul className="p-3 space-y-2">
                  {[
                    "Lead with: 'We saw what happened with your internal build — Gong is also a different bet.'",
                    "Anchor price at $72K mid-band; Marcus's $50K threshold is approval, not budget.",
                    "Ask: 'If sandbox is in your hands by Friday, what does Marcus need to see Monday?'",
                  ].map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                      <span className="leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>
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

function AboutCard() {
  return (
    <div className="bg-card border border-border rounded text-[12px]">
      <div className="px-3 py-2 border-b border-border font-semibold text-[13px]">About this Call</div>
      <Section title="Meeting Source" defaultOpen>
        <Row label="Platform" value={<span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-[#2D8CFF]" /> Zoom Meeting</span>} />
        <Row label="Status" value={<span className="text-teal flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" /> Live</span>} />
        <Row label="Started" value="2:00 PM (8 min ago)" />
        <Row label="Recording" value="In progress" />
      </Section>
      <Section title="Contact Details" defaultOpen>
        <Row label="Name" value="Maya Chen" />
        <Row label="Title" value="Director of RevOps" />
        <Row label="Email" value="maya@northwind-robotics.io" />
      </Section>
      <Section title="Deal Context">
        <Row label="Account" value="Northwind Robotics" />
        <Row label="Stage" value="Qualification" />
        <Row label="Amount" value="$72,000" />
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
