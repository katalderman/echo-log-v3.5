/**
 * Read + write hooks backed by Lovable Cloud.
 * Replaces all hardcoded seed data that used to live in src/data/calls.ts
 * and src/features/review/data.ts.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CallRow = Database["public"]["Tables"]["calls"]["Row"];
export type CallFieldRow = Database["public"]["Tables"]["call_fields"]["Row"];
export type CallBriefRow = Database["public"]["Tables"]["call_briefs"]["Row"];
export type CallSessionRow = Database["public"]["Tables"]["call_sessions"]["Row"];
export type CallTimelineItemRow = Database["public"]["Tables"]["call_timeline_items"]["Row"];
export type ReviewMetricsRow = Database["public"]["Tables"]["review_metrics"]["Row"];
export type MeetingIntegrationRow = Database["public"]["Tables"]["meeting_integrations"]["Row"];
export type MeetingProvider = Database["public"]["Enums"]["meeting_provider"];

/** Display-side outcome union, mirrored from the `call_outcome` enum. */
export type Outcome = "Qualified" | "Booked" | "No Answer" | "Voicemail" | "Discovery" | "Lost";

/**
 * Placeholder owner used by all seed rows and prototype mutations.
 * Replaced by `auth.uid()` when authentication lands.
 */


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

/* ------------------------------------------------------------------ */
/* Mutations — Review write path                                       */
/* ------------------------------------------------------------------ */

/** Drafts in the team-queue nudge (status = drafted or draft_saved). */
export function useDraftCalls() {
  return useQuery({
    queryKey: ["calls", "drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .in("status", ["drafted", "draft_saved"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as CallRow[];
    },
  });
}

/** Persist a single call_fields row edit (confirmed / skipped / value). */
export function useUpdateCallField(callId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      id: string;
      confirmed?: boolean;
      skipped?: boolean;
      value?: string;
      edited?: boolean;
    }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("call_fields").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (callId) qc.invalidateQueries({ queryKey: ["call_fields", callId] });
    },
  });
}

/** "Save as draft" — mark the call as draft_saved and bump confirmed counts. */
export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      callId: string;
      fieldsConfirmed: number;
      fieldsSkipped: number;
    }) => {
      const { error } = await supabase
        .from("calls")
        .update({
          status: "draft_saved",
          fields_confirmed: input.fieldsConfirmed,
          fields_skipped: input.fieldsSkipped,
        })
        .eq("id", input.callId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

/** "Confirm & Sync" — persist edits, then mark the call synced. */
export function useSyncCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      callId: string;
      summary: string;
      rows: { id: string; value: string; edited: boolean }[];
      fieldsConfirmed: number;
      fieldsSkipped: number;
    }) => {
      // Persist any inline edits made inside the sync modal.
      for (const r of input.rows) {
        const { error } = await supabase
          .from("call_fields")
          .update({ value: r.value, edited: r.edited, confirmed: true })
          .eq("id", r.id);
        if (error) throw error;
      }
      const { error: callErr } = await supabase
        .from("calls")
        .update({
          status: "synced",
          summary: input.summary,
          synced_at: new Date().toISOString(),
          fields_confirmed: input.fieldsConfirmed,
          fields_skipped: input.fieldsSkipped,
        })
        .eq("id", input.callId);
      if (callErr) throw callErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["call_fields", vars.callId] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Meeting integrations (Import modal)                                 */
/* ------------------------------------------------------------------ */

/** All meeting integrations for the current user. */
export function useMeetingIntegrations() {
  return useQuery({
    queryKey: ["meeting_integrations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as MeetingIntegrationRow[];
      const { data, error } = await supabase
        .from("meeting_integrations")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as MeetingIntegrationRow[];
    },
  });
}

/** Connect / disconnect a single provider. Upserts on (user_id, provider). */
export function useToggleIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { provider: MeetingProvider; connect: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("meeting_integrations")
        .upsert(
          {
            user_id: user.id,
            provider: input.provider,
            status: input.connect ? "connected" : "disconnected",
            connected_at: input.connect ? now : null,
          },
          { onConflict: "user_id,provider" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting_integrations"] });
    },
  });
}
