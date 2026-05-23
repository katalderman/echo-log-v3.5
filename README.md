# Pulse — call review & sync prototype

Pulse listens to a sales call, drafts seven CRM fields, and lets the rep
**confirm or skip** each one before anything writes to Salesforce. No
silent sync.

This repo is a UI prototype: routing, state, and persistence are real;
Zoom ingestion, the LLM, and the Salesforce write are mocked.

For the product hypothesis, screen-by-screen breakdown, metrics, and
mocked-vs-real boundary, see [`PRD.md`](./PRD.md).

---

## User flow

```
Active Call ──► Review & Confirm ──► Sync Modal ──► Synced
 (/calls/active)  (/)                  (overlay)     (/calls/complete/:id)
                    │                                       ▲
                    └─ Save as Draft ───────────────────────┘
                    (resumed from queue)

                                                  Previous Calls
                                                  (/calls/history)
                                                       │
                                                       ▼ (read-only history)
                                                  /calls/complete/:id
```

1. **Active Call** — Pulse is listening; rep sees a pre-call brief, talking
   points, and a quick-note pad.
2. **Review & Confirm** — seven AI-drafted fields. Each must be confirmed
   or skipped. Sync stays disabled until all seven are resolved.
3. **Sync Modal** — last-look overlay. Rows are inline-editable; edits
   travel with the payload. A 3-step animation simulates the write.
4. **Synced** — what just happened, rendered from the persisted payload
   (so edits and skips are reflected, not assumed).
5. **Previous Calls** — searchable history; clicking a row deep-links to
   the Synced page in read-only mode.

---

## Project structure

```
src/
├── App.tsx                       # routes only
├── main.tsx
│
├── components/
│   ├── shell/                    # Cross-feature layout chrome
│   │   ├── Shell.tsx             #   NavRail, TopBar, BreadcrumbTabs
│   │   └── StateControls.tsx     #   Demo state toggles + Skeleton
│   └── ui/                       # shadcn/ui primitives
│
├── features/                     # Each folder is a self-contained screen
│   ├── review/                   # /  — Review & Confirm
│   │   ├── ReviewPage.tsx        #     display: composes the layout
│   │   ├── useReviewState.ts     #     state + persistence (the only hook)
│   │   ├── data.ts               #     types + fallback seed fields
│   │   └── components/
│   │       ├── SyncModal.tsx     #     overlay: edit-then-write
│   │       └── ImportModal.tsx   #     overlay: bring an external transcript
│   │
│   ├── synced/                   # /calls/complete/:id  — Synced
│   │   ├── SyncedPage.tsx        #     display
│   │   └── useSyncedPayload.ts   #     reads what review wrote
│   │
│   ├── active-call/              # /calls/active
│   │   └── ActiveCallPage.tsx
│   ├── history/                  # /calls/history
│   │   └── PreviousCallsPage.tsx
│   └── not-found/                # *
│       └── NotFoundPage.tsx
│
├── data/calls.ts                 # Shared mock data (queue, history, fields)
├── hooks/                        # Generic hooks (use-toast, use-mobile)
└── lib/utils.ts                  # cn() and friends
```

### Architectural rules

- **Display is dumb.** Page components receive props and render. No
  network calls, no timers — those belong in hooks.
- **State lives in `useXxxState` hooks.** `useReviewState` owns every
  field, draft, voice-amendment, and sync handler for `/`. Swapping the
  backend means rewriting one hook.
- **Data is a module, not a hook.** Shared types and fallback seeds
  live in `features/<name>/data.ts` so they can be imported from
  anywhere.
- **Group by feature, not by type.** A new screen = a new folder under
  `features/` with its own page, hook, data, and any local components.
  Promote to `components/shell/` only if two features share it.

---

## Data layer

Read **and** write paths are backed by Lovable Cloud (Supabase). All
hooks live in `src/lib/queries.ts`:

| Hook                          | Reads / writes                              |
| ----------------------------- | ------------------------------------------- |
| `useCallsQueue()`             | `calls` (in_review / drafted / draft_saved) |
| `usePreviousCalls()`          | `calls` (synced)                            |
| `useDraftCalls()`             | `calls` (drafted / draft_saved)             |
| `useCall(slug)`               | `calls` by slug                             |
| `useCallFields(id)`           | `call_fields`                               |
| `useCallBrief(id)`            | `call_briefs`                               |
| `useCallTimeline(id)`         | `call_timeline_items`                       |
| `useCallSession(id)`          | `call_sessions`                             |
| `useReviewMetrics()`          | `review_metrics`                            |
| `useUpdateCallField(callId)`  | updates one `call_fields` row               |
| `useSaveDraft()`              | sets `calls.status = 'draft_saved'`         |
| `useSyncCall()`               | persists edits and sets `calls.status = 'synced'` |

`useReviewState` mirrors `call_fields` into local state so confirm /
skip / edit / voice-amendment interactions stay instant, then fires
mutations through the hooks above. The Sync modal hands the final row
set to `useSyncCall`, which writes per-field edits and flips the call
to `synced` in one transaction-shaped batch.

`useSyncedPayload` reads the post-sync rows back from `call_fields`
(plus drafts from `useDraftCalls`) so the Synced screen reflects
*what actually happened* — edits, skips, and the saved summary — with
no `localStorage` in the loop.

Pages render real loading/error/empty states off React Query status.
The `StateControls` widget remains as a demo override that lets you
preview any state on top of the live data.

---

## Running locally

```sh
npm install
npm run dev
```

Routes worth visiting:

- `/` — Review & Confirm (the main screen)
- `/calls/active` — Active call (live, backed by `calls` + `call_briefs` + `call_sessions`)
- `/calls/history` — Previous calls table (backed by `calls` + `review_metrics`)
- `/calls/complete/maya-chen` — Synced screen (after a sync, or empty fallback)

---

## Next steps

### Add authentication & lock down the database

Tables are in place (`calls`, `call_fields`, `profiles`, `contacts`,
`call_briefs`, `call_timeline_items`, `call_sessions`, `review_metrics`,
`meeting_integrations`), but **row-level security is currently open** —
anyone with the anon key can read or write any row. This is intentional
for the prototype; it is **not safe for production**.

Before shipping:

1. Add authentication (email/password + Google sign-in is the default).
2. Replace the open RLS policies with policies scoped to
   `owner_id = auth.uid()` (and equivalent joins for child tables).
3. Set `owner_id` on insert from the authenticated user.

