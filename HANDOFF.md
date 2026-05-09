# Pulse — Engineering Handoff

This document hands off the Pulse prototype to the engineering team taking it
to production. It assumes you've skimmed [`README.md`](./README.md) (architecture)
and [`PRD.md`](./PRD.md) (product intent). This file covers **what's here, how
it fits together, and where to start**.

---

## Start Here

**Goal**: turn this UI prototype into a real product. Routing, page-level
state, and the localStorage persistence contract are real. Everything that
crosses a network boundary (Zoom, the LLM, Salesforce) is mocked.

### Suggested onboarding path (≈ 1 day)

1. **Run it locally.**
   ```sh
   npm install && npm run dev
   ```
   Visit `/` (the main screen). Confirm a few fields, skip one, click
   **Confirm & Sync to Salesforce**, watch the modal animate, land on the
   Synced screen, hit **Back to Queue** to start over. That's the loop.

2. **Read `README.md`** (architecture rules) and **`PRD.md`** (why this exists,
   hypothesis, metrics). Don't skip the PRD — the *confirm-or-skip, never
   silent-sync* posture is load-bearing.

3. **Read these three files in order — that's the whole prototype's brain:**
   - [`src/features/review/data.ts`](./src/features/review/data.ts) — types,
     seed data, `STORAGE_KEYS`. The data model lives here.
   - [`src/features/review/useReviewState.ts`](./src/features/review/useReviewState.ts)
     — the only stateful hook. Owns every interaction on `/`.
   - [`src/features/review/ReviewPage.tsx`](./src/features/review/ReviewPage.tsx)
     — the main screen. Pure display; reads from the hook.

4. **Trace one round-trip end-to-end.** Confirm a field on `/`, change it in
   the Sync Modal, confirm sync, then on the Synced page (`/calls/complete/maya-chen`)
   verify the edited value appears under "What Just Synced". The contract
   that makes this work is two `localStorage` keys defined in `data.ts` and
   read by `useSyncedPayload`. Replace those reads/writes with API calls and
   you have a working backend.

5. **Pick your first ticket.** See *What ships next* below.

### Where you'll spend your time

| If you're working on… | Start in… |
|---|---|
| The review experience | `src/features/review/` |
| The post-sync screen | `src/features/synced/` |
| The pre-call/in-call UI | `src/features/active-call/` |
| Call history table | `src/features/history/` |
| Layout chrome (nav, top bar, tabs) | `src/components/shell/` |
| Mock data (queue, history, fields) | `src/data/calls.ts` |
| Design tokens | `src/index.css`, `tailwind.config.ts` |

### Architecture rules (don't break these)

- **Display is dumb.** Page components receive props and render. No
  `localStorage`, no timers — those belong in hooks.
- **State lives in `useXxxState` hooks.** Swapping the mock backend = rewriting
  one hook.
- **Data is a module, not a hook.** Seeds, types, and `STORAGE_KEYS` are
  importable from anywhere.
- **Group by feature, not by type.** New screen = new folder under `features/`.
- **Tokens, not raw colors.** Use `bg-primary`, not `bg-blue-500`. All tokens
  are HSL in `index.css`.

---

## Component inventory

### Pages (one per route)

| File | Route | Purpose |
|---|---|---|
| `features/review/ReviewPage.tsx` | `/` | Review & Confirm — the main screen. Renders 7 AI-drafted fields and gates sync until each is confirmed or skipped. |
| `features/synced/SyncedPage.tsx` | `/calls/complete/:id` | Post-sync receipt. Reads the persisted payload so it shows what *actually* synced (edits, skips), not a canned snapshot. Doubles as a read-only history view when `:id` matches a previous call. |
| `features/active-call/ActiveCallPage.tsx` | `/calls/active` | In-call mock. Pre-call brief, talking points, quick-note pad. Demonstrates the "Pulse is listening, you don't need to take field notes" promise. |
| `features/history/PreviousCallsPage.tsx` | `/calls/history` | Searchable, filterable table of previously synced calls. Rows deep-link into the Synced page in history mode. |
| `features/not-found/NotFoundPage.tsx` | `*` | 404 fallback. |

### Layout chrome — `src/components/shell/`

| Component | Purpose |
|---|---|
| `NavRail` | 60px-wide left rail (Salesforce Lightning–style). Active state derived from route. |
| `TopBar` | Sticky 48px header with global search and avatar. |
| `BreadcrumbTabs` | Salesforce-style breadcrumb + active tab strip under the top bar. |
| `AppShell` | Convenience wrapper combining the three above. Currently each page composes them directly. |
| `StateControls` | Demo toggle pill group for switching between `normal`/`loading`/`empty`/`error` page states. Used on Active Call, Synced, and History. |
| `Skeleton` | One-class shimmer placeholder used inside loading states. |

### Review feature — `src/features/review/`

| File | Purpose |
|---|---|
| `ReviewPage.tsx` | Composes the 3-column layout (About / Center / Activity) plus modals. All sub-components below (`StatBanner`, `RecordHeader`, `SourceBanner`, `PathBar`, `AboutCard`, `CenterHeader`, `SummaryBlock`, `FieldCard`, `AmendmentInput`, `ActivityTimeline`, `PipelineReviewPreview`, `TodoFooter`, `FloatingRecChip`) are co-located inside this file because they're tightly coupled to its layout. Promote any of them to `components/` if a second feature needs them. |
| `useReviewState.ts` | The only stateful hook on `/`. Owns: field state, summary, expanded sources, path step, voice-amendment recording, draft persistence, and the `doSync` writer. |
| `data.ts` | `Field`, `FieldKey`, `Confidence`, `SyncRow`, `SyncedPayload`, `DraftRecord`, `TimelineGroup` types; `SEED_FIELDS`, `SEED_SUMMARY`, `TIMELINE_GROUPS` seeds; `STORAGE_KEYS`. |
| `components/SyncModal.tsx` | "Sync to Salesforce?" overlay. Inline-editable rows, edited-since-AI badge, 3-step progress animation, simulated-error path. Emits the final `SyncRow[]` to `onConfirm`. |
| `components/ImportModal.tsx` | "Import Transcript" overlay (paste / upload / connect source). Tab-switch UI; processing animation; resolves with a toast. |

### Synced feature — `src/features/synced/`

| File | Purpose |
|---|---|
| `SyncedPage.tsx` | Renders post-sync confirmation. Two modes: fresh-sync (driven by persisted payload) and history (matches `:id` against `PREVIOUS_CALLS`). Sub-components (`Stat`, `AboutCard`, `PipelinePushPreview`) are co-located. |
| `useSyncedPayload.ts` | Reads `STORAGE_KEYS.syncedMaya` and `STORAGE_KEYS.drafts` from localStorage. Returns `{ drafts, syncedPayload }`. Replace the `localStorage` reads with API calls when a backend exists. |

### UI primitives — `src/components/ui/`

Standard shadcn/ui set (button, dialog, toast, sonner, table, etc.). Untouched
from the generator. Customise via `tailwind.config.ts` and `index.css` tokens
rather than editing these files.

### Generic hooks — `src/hooks/`

- `use-toast.ts` — re-export wrapper around the shadcn toast.
- `use-mobile.tsx` — `window.matchMedia` breakpoint hook.

---

## Data model

There is no backend. "The data model" is a set of TypeScript types + two
`localStorage` keys that simulate a database.

### Core types — defined in `src/features/review/data.ts`

```ts
type FieldKey =
  | "outcome" | "next" | "dm" | "budget"
  | "timeline" | "objections" | "sentiment";

type Confidence = "high" | "med" | "low";

type Field = {
  key: FieldKey;
  label: string;          // "Call outcome"
  value: string;          // The AI's drafted value
  confidence: Confidence; // Drives the dot color
  source: { speaker: string; ts: string; quote: string }; // Citation
  confirmed: boolean;
  skipped?: boolean;
};
```

The seven `FieldKey`s are the entire CRM-write surface. To add an eighth
field, extend `FieldKey`, add to `SEED_FIELDS`, and the rest of the system
picks it up automatically — `useReviewState` is `FieldKey`-agnostic, the
Sync Modal renders whatever rows it gets, and the Synced page renders
whatever was persisted.

### Call record — defined in `src/data/calls.ts`

```ts
type CallRecord = {
  id: string;             // Used as URL param: /calls/complete/:id
  contact: string;        // "Maya Chen"
  company: string;
  title: string;
  date: string;           // Pre-formatted; no Date objects in this prototype
  duration: string;       // "24m 18s"
  outcome: Outcome;       // Qualified | Booked | No Answer | Voicemail | Discovery | Lost
  fieldsConfirmed: number;
  fieldsTotal: number;    // Always 7 for now
  syncedAt: string | null;
  reviewed: boolean;
  amount?: string;
};
```

Two arrays of these power the entire app: `REVIEW_QUEUE` (today's calls
awaiting review) and `PREVIOUS_CALLS` (history). `CONFIRMED_FIELDS` is a
fallback snapshot used only if `localStorage` is empty when the Synced page
loads.

### Persistence contract

Two `localStorage` keys, both centralised in `STORAGE_KEYS`:

| Key | Shape | Written by | Read by |
|---|---|---|---|
| `pulse:drafts` | `DraftRecord[]` | `useReviewState.saveDraft` | `useSyncedPayload` (to surface "Resume" rows in the team queue) |
| `pulse:synced:maya-chen` | `SyncedPayload` | `useReviewState.doSync` | `useSyncedPayload` (drives the "What Just Synced" rendering) |

```ts
type SyncedPayload = {
  summary: string;
  syncedFields: { key, label, value, original, edited, source }[];
  skippedFields: { key, label, value }[];
  syncedAt: string;       // ISO timestamp
};

type DraftRecord = {
  id: string;             // Matches CallRecord.id
  contact, company, duration, date: string;
  fieldsConfirmed: number;
  fieldsTotal: number;
  savedAt: string;        // ISO
};
```

This contract is the prototype's "API". When you build the real backend,
preserve the shape — replace `localStorage.getItem` with `fetch` and
nothing else needs to change in the display layer.

### State machine (per field)

```
                ┌──── toggleConfirm ────►  confirmed
                │                          (skipped:false)
   drafted ────┤
                │
                └──── toggleSkip ───────►  skipped
                                            (confirmed:false)
```

A field is **resolved** when `confirmed || skipped`. Sync is gated on all
seven fields being resolved (`useReviewState.resolvedCount === 7`).

---

## Mocked vs. real

### Real (don't reinvent)

- **Routing** — React Router 6, all five routes wired in `src/App.tsx`.
- **Page-level state & interactions** — confirm/skip toggles, summary
  editing, modal open/close, voice-amendment recording timer, sync animation
  progression, Sync Modal inline edits, "edited" badge logic.
- **Persistence contract** — the two `localStorage` keys above. Reflects
  reality across navigation.
- **Demo state controls** — toggle loading/empty/error on Active Call,
  Synced, and History pages.
- **Toast notifications** — sonner, wired throughout.
- **Design system** — HSL tokens in `index.css`, mapped through
  `tailwind.config.ts`. Salesforce Lightning visual language.

### Mocked (replace these to ship)

| Mock | Where | Replace with |
|---|---|---|
| Zoom ingestion | Active Call page; "Drafted from Zoom" banner on Review | Real Zoom (or Gong/Meet) recording webhook → transcript pipeline |
| AI drafting | `SEED_FIELDS`, `SEED_SUMMARY` in `data.ts` | LLM call (Lovable AI Gateway is the default path) returning the same `Field[]` shape |
| Voice amendment transcription | `useReviewState.stopRecord` setTimeout | Real STT + diff against existing fields |
| Salesforce write | `useReviewState.doSync` writes to localStorage | Salesforce REST API call; keep the `SyncedPayload` shape |
| Verification | `verifyState` toggle on Synced page | Post-write read-back to confirm fields landed |
| Sync error path | `simulateError` checkbox in Sync Modal | Real error handling + retry |
| Manager pipeline view | `PipelinePushPreview` on Synced page | Real aggregated forecast component |
| Drafts queue | `pulse:drafts` localStorage | Per-user backend store |
| Auth / multi-user | Hardcoded "Jordan Reyes" avatar | Lovable Cloud auth (recommended) |
| Date/time formatting | Pre-formatted strings everywhere | Real `Date` objects + a formatter |
| Mock contacts/queue/history | `src/data/calls.ts` | API-backed lists |

There is **no backend, no auth, no network layer** in this codebase. Every
"async" thing you see is a `setTimeout`.

---

## What ships next (suggested order)

1. **Stand up Lovable Cloud.** Replace the two localStorage reads/writes
   with database calls. Smallest possible change, biggest correctness win.
2. **Real LLM draft.** Swap `SEED_FIELDS` for a server call returning the
   same shape. Keep the citations — they're the trust mechanic.
3. **Real Salesforce write + verify.** Implement `doSync` against the
   Salesforce REST API; light up the verification timeout state with real
   read-back logic.
4. **Auth.** Multi-user means the "Jordan Reyes" hardcode goes away and
   `pulse:drafts` becomes per-user.
5. **Real Zoom ingestion.** Webhook → transcript → draft pipeline. The
   Active Call screen becomes the live state of that pipeline.
6. **Manager dashboard.** Promote `PipelinePushPreview` from a stub into
   a real route backed by aggregated data.

---

## Gotchas

- **No `Date` objects.** Dates are formatted strings in mock data. When you
  add real data, convert at the boundary, not in display components.
- **`maya-chen` is hardcoded** in a few places (`STORAGE_KEYS.syncedMaya`,
  `saveDraft`, redirect targets). Generalise these when the second call
  becomes real.
- **The Sync Modal owns its edits.** It receives confirmed fields as props,
  tracks `edited` locally, and emits the final `SyncRow[]` only on confirm.
  Don't try to sync edits back into `useReviewState` mid-flow.
- **Path bar steps differ per page.** Active Call has 6 steps, Review has 5.
  This is intentional — they represent the rep's progress, not a shared
  state machine.
- **`confirmAll` respects skips.** It only confirms fields that aren't
  skipped. Don't "fix" this.
- **Tokens are HSL.** Never write raw hex/rgb in components. If you need a
  new color, add it to `index.css` and `tailwind.config.ts` first.
