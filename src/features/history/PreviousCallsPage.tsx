import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Phone, Mail, Filter, Check, TrendingUp, Clock, Award, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { NavRail, TopBar, BreadcrumbTabs } from "@/components/shell/Shell";
import { StateControls, Skeleton, ScreenState } from "@/components/shell/StateControls";
import { cn } from "@/lib/utils";
import { PREVIOUS_CALLS, Outcome } from "@/data/calls";

const TIME_FILTERS = ["All", "This Week", "This Month", "Last Quarter", "Custom range"];
const OUTCOMES: ("All Outcomes" | Outcome)[] = ["All Outcomes", "Qualified", "Booked", "No Answer", "Voicemail"];

const OUTCOME_STYLES: Record<Outcome, string> = {
  Qualified: "bg-success/10 text-success border-success/30",
  Booked: "bg-info text-primary border-info-border",
  Discovery: "bg-accent text-primary border-info-border",
  "No Answer": "bg-secondary text-muted-foreground border-border",
  Voicemail: "bg-[#FFF7E6] text-warning-foreground border-warning/40",
  Lost: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function PreviousCallsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [time, setTime] = useState("All");
  const [outcome, setOutcome] = useState<typeof OUTCOMES[number]>("All Outcomes");
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Loading state ≥ 600ms even if instant.
  useEffect(() => {
    if (screenState !== "loading") return;
    const t = window.setTimeout(() => setScreenState("normal"), 700);
    return () => clearTimeout(t);
  }, [screenState]);

  // Trigger loading shimmer briefly on filter change.
  useEffect(() => {
    if (screenState === "error" || screenState === "empty") return;
    setScreenState("loading");
  }, [search, time, outcome]);

  const rows = useMemo(() => {
    return PREVIOUS_CALLS.filter((c) => {
      if (outcome !== "All Outcomes" && c.outcome !== outcome) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.contact.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.outcome.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, time, outcome]);

  const clearFilters = () => {
    setSearch("");
    setTime("All");
    setOutcome("All Outcomes");
  };
  const isBrandNew = screenState === "empty";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <BreadcrumbTabs crumbs={[{ label: "Calls", to: "/" }, { label: "Previous Reviews" }]} />

        <main className="flex-1 px-6 py-4 space-y-4">
          <div className="flex justify-end">
            <StateControls value={screenState} onChange={setScreenState} />
          </div>
          {/* Page header */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[22px] font-semibold leading-tight">Previous Calls</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {PREVIOUS_CALLS.length} reviewed and synced calls.
              </div>
            </div>
            <div className="flex-1 max-w-md relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by contact, company, or topic..."
                className="w-full h-9 pl-9 pr-3 text-[13px] bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Filters — hidden for brand-new users */}
          {!isBrandNew && <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Time</span>
              {TIME_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTime(f)}
                  className={cn(
                    "h-7 px-3 text-[12px] rounded-full border transition-colors",
                    time === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Outcome</span>
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "h-7 px-3 text-[12px] rounded-full border transition-colors",
                    outcome === o
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>}

          <div className="grid grid-cols-12 gap-4">
            {/* Table */}
            <div className={cn(isBrandNew ? "col-span-12" : "col-span-9")}>
              <div className={cn(
                "bg-card border border-border rounded overflow-hidden",
                screenState === "error" && "border-l-4 border-l-destructive"
              )}>
                {screenState === "error" ? (
                  <div className="px-6 py-12 text-center">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                    <div className="text-[14px] font-semibold text-destructive">Couldn't load your call history.</div>
                    <div className="text-[12px] text-muted-foreground mt-1 max-w-md mx-auto">
                      Salesforce returned an error. Your data isn't lost — try refreshing the page.
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setScreenState("loading")}
                        className="h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                      </button>
                      <button
                        onClick={() => setShowErrorDetails((v) => !v)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {showErrorDetails ? "Hide" : "View"} error details
                      </button>
                    </div>
                    {showErrorDetails && (
                      <div className="mt-3 mx-auto max-w-md text-left bg-secondary border border-border rounded px-3 py-2 text-[11px] font-mono text-muted-foreground">
                        Request ID: 7d2c9f3e-4a1b-419c-bc92-1f3d80a2c114<br />
                        Status: 503 SERVICE_UNAVAILABLE · pulse-api/v3
                      </div>
                    )}
                  </div>
                ) : screenState === "loading" ? (
                  <table className="w-full text-[12px]">
                    <thead className="bg-secondary/60 border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <Th>Contact</Th><Th>Company</Th><Th>Call Date</Th><Th>Duration</Th>
                        <Th>Outcome</Th><Th>Fields</Th><Th>Synced At</Th>
                        <Th className="text-right pr-3">Action</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-28" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-24" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-20" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-12" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-16 rounded-full" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-8" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-3 w-20" /></td>
                          <td className="px-3 py-2.5 text-right pr-3"><Skeleton className="h-6 w-12 ml-auto" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : isBrandNew ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-secondary border border-border grid place-items-center mx-auto mb-3">
                      <Inbox className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-[14px] font-semibold">You haven't reviewed any calls yet.</div>
                    <div className="text-[12px] text-muted-foreground mt-1">Once you sync your first call, it'll show up here.</div>
                    <button
                      onClick={() => navigate("/")}
                      className="mt-4 h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Go to Today's Queue
                    </button>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <div className="text-[14px] font-medium">No reviewed calls match these filters.</div>
                    <div className="text-[12px] text-muted-foreground mt-1">Try expanding the date range or clearing the outcome filter.</div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button onClick={clearFilters} className="h-8 px-3 text-[12px] border border-border rounded hover:bg-secondary">
                        Clear All Filters
                      </button>
                      <button
                        onClick={() => { clearFilters(); setTime("This Month"); }}
                        className="h-8 px-3 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        View This Month
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead className="bg-secondary/60 border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <Th>Contact</Th>
                        <Th>Company</Th>
                        <Th>Call Date</Th>
                        <Th>Duration</Th>
                        <Th>Outcome</Th>
                        <Th>Fields</Th>
                        <Th>Synced At</Th>
                        <Th className="text-right pr-3">Action</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => navigate(`/calls/complete/${c.id}`)}
                          className="hover:bg-secondary/40 cursor-pointer"
                        >
                          <td className="px-3 py-2.5">
                            <span className="text-primary font-medium hover:underline">{c.contact}</span>
                            <div className="text-[10px] text-muted-foreground">{c.title}</div>
                          </td>
                          <td className="px-3 py-2.5">{c.company}</td>
                          <td className="px-3 py-2.5">{c.date}</td>
                          <td className="px-3 py-2.5 num">{c.duration}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", OUTCOME_STYLES[c.outcome])}>
                              {c.outcome}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 num">
                            <span className={cn(c.fieldsConfirmed === c.fieldsTotal && "text-success font-medium")}>
                              {c.fieldsConfirmed}/{c.fieldsTotal}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{c.syncedAt}</td>
                          <td className="px-3 py-2.5 text-right pr-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/calls/complete/${c.id}`); }}
                              className="h-7 px-3 text-[11px] font-medium border border-primary text-primary rounded hover:bg-primary/5"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Stats card — hidden for brand-new users */}
            {!isBrandNew && <div className="col-span-3">
              <div className="bg-card border border-border rounded">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[13px] font-semibold">Your Review Stats</div>
                  <div className="text-[10px] text-muted-foreground">This month</div>
                </div>
                <div className="p-3 space-y-3">
                  <StatRow I={Phone} label="Calls reviewed" value="47" tone="text-foreground" />
                  <StatRow I={Clock} label="Time saved" value="18m" tone="text-success" sub="vs manual entry" />
                  <StatRow I={Award} label="Confirmed without amendment" value="96%" tone="text-success" sub="trust signal" />
                  <div className="bg-info border border-info-border rounded p-2 text-[11px] text-primary mt-2">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <TrendingUp className="w-3 h-3" /> Top 5% on team
                    </div>
                    <div className="text-muted-foreground mt-0.5 leading-snug">You're reviewing faster than 95% of reps and amending fewer fields.</div>
                  </div>
                </div>
              </div>
            </div>}
          </div>
        </main>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("text-left font-semibold px-3 py-2", className)}>{children}</th>;
}

function StatRow({ I, label, value, tone, sub }: { I: any; label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded bg-secondary grid place-items-center shrink-0">
        <I className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={cn("text-[18px] font-semibold leading-tight num", tone)}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
