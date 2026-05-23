import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  /** Short error title shown in the destructive heading. */
  title?: string;
  /** Optional one-liner under the title — defaults to a friendly retry hint. */
  message?: string;
  /** Underlying error from React Query; used for the optional details panel. */
  error?: unknown;
  /** Stable request id surface — falls back to a generated one. */
  requestId?: string;
  /** Callback wired to the consumer's `query.refetch()`. */
  onRetry: () => void;
  /** Pending state — disables the retry button while a refetch is in flight. */
  retrying?: boolean;
  /** Visually adjust for tighter contexts (column cards vs full pages). */
  compact?: boolean;
}

/**
 * QueryErrorCard — the canonical "Couldn't reach Pulse" full-card error state.
 *
 * Use whenever a Supabase / React Query read fails. Renders inside its
 * container (caller controls width). Never use for inline form errors —
 * those use a destructive <Alert> instead.
 */
export function QueryErrorCard({
  title = "Couldn't reach Pulse",
  message = "We hit a snag loading this. Your data isn't lost — try again.",
  error,
  requestId,
  onRetry,
  retrying = false,
  compact = false,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const errorRequestId =
    error && typeof error === "object" && "requestId" in error
      ? String((error as { requestId?: unknown }).requestId ?? "")
      : "";
  const resolvedRequestId = requestId || errorRequestId || fallbackRequestId();
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : error
      ? JSON.stringify(error)
      : "No additional detail.";

  return (
    <div
      className={
        "bg-card border border-border border-l-4 border-l-destructive rounded text-center " +
        (compact ? "px-4 py-8" : "px-6 py-12")
      }
      role="alert"
    >
      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
      <div className="text-[14px] font-semibold text-destructive">{title}</div>
      <div className="text-[12px] text-muted-foreground mt-1 max-w-md mx-auto">
        {message}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={onRetry}
          disabled={retrying}
          className="h-8 px-4 text-[12px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <RefreshCw className={"w-3.5 h-3.5 " + (retrying ? "animate-spin" : "")} />
          {retrying ? "Retrying…" : "Retry"}
        </button>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-[11px] text-primary hover:underline"
        >
          {showDetails ? "Hide" : "View"} error details
        </button>
      </div>
      {showDetails && (
        <div className="mt-3 mx-auto max-w-md text-left bg-secondary border border-border rounded px-3 py-2 text-[11px] font-mono text-muted-foreground break-all">
          Request ID: {resolvedRequestId}
          <br />
          {detail}
        </div>
      )}
    </div>
  );
}

function fallbackRequestId() {
  // Short, opaque, stable-per-mount id so support can correlate.
  return (
    Math.random().toString(16).slice(2, 10) +
    "-" +
    Date.now().toString(16).slice(-6)
  );
}
