import { cn } from "@/lib/utils";

export type ScreenState = "normal" | "loading" | "empty" | "error";

const LABELS: Record<ScreenState, string> = {
  normal: "Default",
  loading: "Loading",
  empty: "Empty",
  error: "Error",
};

export function StateControls<T extends string>({
  value,
  onChange,
  options = ["normal", "loading", "empty", "error"] as T[],
  label = "Simulate state",
  optionLabels,
}: {
  value: T;
  onChange: (v: T) => void;
  options?: T[];
  label?: string;
  optionLabels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="bg-card border border-border rounded px-3 py-1.5 flex items-center gap-2 text-[11px]">
      <span className="text-muted-foreground uppercase tracking-wide font-semibold">{label}</span>
      <div className="flex items-center gap-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "h-6 px-2.5 rounded-full border transition-colors",
              value === o
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {optionLabels?.[o] ?? (LABELS as any)[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sl-skeleton", className)} />;
}
