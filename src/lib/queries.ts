/**
 * Read hooks backed by Lovable Cloud.
 * Replaces the hardcoded seed exports in src/data/calls.ts and
 * src/features/review/data.ts. Write paths are migrated in a later commit.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CallRow = Database["public"]["Tables"]["calls"]["Row"];
export type CallFieldRow = Database["public"]["Tables"]["call_fields"]["Row"];
export type CallBriefRow = Database["public"]["Tables"]["call_briefs"]["Row"];
export type CallSessionRow = Database["public"]["Tables"]["call_sessions"]["Row"];
export type CallTimelineItemRow = Database["public"]["Tables"]["call_timeline_items"]["Row"];
export type ReviewMetricsRow = Database["public"]["Tables"]["review_metrics"]["Row"];

/* ------------------------------------------------------------------ */
/* Formatters — convert DB shapes into the display strings the UI uses */
/* ------------------------------------------------------------------ */

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

export function formatCallDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatSyncedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAmount(cents: number | null): string | undefined {
  if (cents === null) return undefined;
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Today's queue — calls in `in_review` or `drafted` status. */
export function useCallsQueue() {
  return useQuery({
    queryKey: ["calls", "queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .in("status", ["in_review", "drafted", "draft_saved"])
        .order("call_date", { ascending: false });
      if (error) throw error;
      return data as CallRow[];
    },
  });
}

/** Synced history. */
export function usePreviousCalls() {
  return useQuery({
    queryKey: ["calls", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("status", "synced")
        .order("synced_at", { ascending: false });
      if (error) throw error;
      return data as CallRow[];
    },
  });
}

/** Single call by slug (used by route params). */
export function useCall(slug: string | undefined) {
  return useQuery({
    queryKey: ["call", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as CallRow | null;
    },
  });
}

export function useCallFields(callId: string | undefined) {
  return useQuery({
    queryKey: ["call_fields", callId],
    enabled: !!callId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_fields")
        .select("*")
        .eq("call_id", callId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as CallFieldRow[];
    },
  });
}

export function useCallBrief(callId: string | undefined) {
  return useQuery({
    queryKey: ["call_brief", callId],
    enabled: !!callId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_briefs")
        .select("*")
        .eq("call_id", callId!)
        .maybeSingle();
      if (error) throw error;
      return data as CallBriefRow | null;
    },
  });
}

export function useCallTimeline(callId: string | undefined) {
  return useQuery({
    queryKey: ["call_timeline", callId],
    enabled: !!callId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_timeline_items")
        .select("*")
        .eq("call_id", callId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as CallTimelineItemRow[];
    },
  });
}

export function useCallSession(callId: string | undefined) {
  return useQuery({
    queryKey: ["call_session", callId],
    enabled: !!callId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("call_id", callId!)
        .maybeSingle();
      if (error) throw error;
      return data as CallSessionRow | null;
    },
  });
}

/**
 * Latest review-metrics row (most recent period_start).
 * Single-tenant for now; rebinds to auth.uid() in the auth commit.
 */
export function useReviewMetrics() {
  return useQuery({
    queryKey: ["review_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_metrics")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ReviewMetricsRow | null;
    },
  });
}
