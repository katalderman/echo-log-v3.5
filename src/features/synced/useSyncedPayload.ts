import { useCall, useCallFields, useDraftCalls, formatCallDate, formatDuration } from "@/lib/queries";

/**
 * Display shape for the "What Just Synced" panel and the team-queue drafts list.
 * Kept local to the Synced screen — the underlying rows live in `calls`
 * and `call_fields` and are fetched via React Query.
 */
export type SyncedFieldView = {
  key: string;
  label: string;
  value: string;
  source: string;
  edited: boolean;
};

export type SyncedPayloadView = {
  summary: string | null;
  syncedFields: SyncedFieldView[];
  skippedFields: { key: string; label: string; value: string }[];
  syncedAt: string | null;
};

export type DraftView = {
  id: string;
  contact: string;
  company: string;
  duration: string;
  date: string;
  fieldsConfirmed: number;
  fieldsTotal: number;
};

/**
 * useSyncedPayload — sources the Synced screen from Lovable Cloud.
 *
 *   - `syncedPayload`: rows from call_fields for the call identified by `slug`.
 *     Returned for both fresh syncs and history views; the caller decides
 *     whether to render it (history mode falls back to canned data).
 *   - `drafts`: any call still in draft/draft_saved status, for the
 *     team-queue nudge.
 */
export function useSyncedPayload(opts: { slug: string | undefined; isHistory: boolean }) {
  const callQuery = useCall(opts.slug);
  const fieldsQuery = useCallFields(callQuery.data?.id);
  const draftsQuery = useDraftCalls();

  const rows = fieldsQuery.data ?? [];
  const syncedFields: SyncedFieldView[] = rows
    .filter((r) => r.confirmed && !r.skipped)
    .map((r) => ({
      key: r.field_key,
      label: r.label,
      value: r.value,
      edited: r.edited,
      source:
        r.source_speaker && r.source_ts
          ? `${r.source_speaker} at ${r.source_ts}`
          : "",
    }));
  const skippedFields = rows
    .filter((r) => r.skipped)
    .map((r) => ({ key: r.field_key, label: r.label, value: r.value }));

  const hasPayload = syncedFields.length > 0 || skippedFields.length > 0;

  const syncedPayload: SyncedPayloadView | null = !opts.isHistory && hasPayload
    ? {
        summary: callQuery.data?.summary ?? null,
        syncedFields,
        skippedFields,
        syncedAt: callQuery.data?.synced_at ?? null,
      }
    : null;

  const drafts: DraftView[] = (draftsQuery.data ?? []).map((c) => ({
    id: c.slug ?? c.id,
    contact: c.contact_name,
    company: c.company,
    duration: formatDuration(c.duration_seconds),
    date: formatCallDate(c.call_date),
    fieldsConfirmed: c.fields_confirmed,
    fieldsTotal: c.fields_total,
  }));

  return { drafts, syncedPayload, call: callQuery.data ?? null };
}
