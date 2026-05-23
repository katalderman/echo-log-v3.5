import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, FileText, FileUp, Loader2, Plug, Search, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMeetingIntegrations,
  useToggleIntegration,
  type MeetingProvider,
} from "@/lib/queries";

type Props = { onClose: () => void };

/** Display order + labels for the Connect Source grid. */
const PROVIDERS: { key: MeetingProvider; label: string }[] = [
  { key: "zoom", label: "Zoom" },
  { key: "teams", label: "Teams" },
  { key: "google_meet", label: "Google Meet" },
  { key: "granola", label: "Granola" },
  { key: "otter", label: "Otter" },
];

/** ImportModal — bring an external transcript into Pulse for drafting. */
export function ImportModal({ onClose }: Props) {
  const [tab, setTab] = useState<"paste" | "upload" | "connect">("paste");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const integrations = useMeetingIntegrations();
  const toggle = useToggleIntegration();

  useEffect(() => {
    if (!processing) return;
    const t = window.setInterval(() => setProgress((p) => Math.min(100, p + 8)), 120);
    return () => clearInterval(t);
  }, [processing]);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        onClose();
        toast.success("Transcript processed", {
          description: "Drafted from your imported transcript.",
        });
      }, 400);
    }
  }, [progress, onClose]);

  const isConnected = (p: MeetingProvider) =>
    integrations.data?.some((row) => row.provider === p && row.status === "connected") ?? false;

  const handleConnect = (p: MeetingProvider, label: string) => {
    toggle.mutate(
      { provider: p, connect: true },
      {
        onSuccess: () => toast.success(`${label} connected`),
        onError: () => toast.error(`Couldn't connect ${label} — please try again.`),
      },
    );
  };

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
                  onClick={() => setTab(o.k as typeof tab)}
                  className={cn(
                    "border rounded p-3 text-left text-[12px] transition-colors",
                    tab === o.k ? "border-primary bg-accent" : "border-border hover:border-muted-foreground/40",
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
                  {PROVIDERS.map((p) => {
                    const connected = isConnected(p.key);
                    const pending = toggle.isPending && toggle.variables?.provider === p.key;
                    return (
                      <div key={p.key} className="border border-border rounded p-3 text-center">
                        <div className="text-[12px] font-medium mb-2">{p.label}</div>
                        {connected ? (
                          <div className="text-[11px] text-success flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Connected
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConnect(p.key, p.label)}
                            disabled={pending || integrations.isLoading}
                            className="h-7 px-2 text-[11px] border border-primary text-primary rounded hover:bg-primary/5 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {pending && <Loader2 className="w-3 h-3 animate-spin" />} Connect
                          </button>
                        )}
                      </div>
                    );
                  })}
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
