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
│   │   ├── data.ts               #     types, seed fields, storage keys
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
  `localStorage`, no timers — those belong in hooks.
- **State lives in `useXxxState` hooks.** `useReviewState` owns every
  field, draft, voice-amendment, and sync handler for `/`. Swapping the
  mock backend means rewriting one hook.
- **Data is a module, not a hook.** Seeds, types, and `STORAGE_KEYS` live
  in `features/<name>/data.ts` so they can be imported from anywhere
  (e.g. `useSyncedPayload` reads what `useReviewState` wrote without a
  shared parent).
- **Group by feature, not by type.** A new screen = a new folder under
  `features/` with its own page, hook, data, and any local components.
  Promote to `components/shell/` only if two features share it.

### Persistence

Two `localStorage` keys, both defined in `features/review/data.ts`:

| Key                          | Written by         | Read by              |
| ---------------------------- | ------------------ | -------------------- |
| `pulse:drafts`               | `useReviewState`   | `useSyncedPayload`   |
| `pulse:synced:maya-chen`     | `useReviewState`   | `useSyncedPayload`   |

This is the contract that lets the Synced screen reflect *what actually
happened* on Review (edits, skips) instead of a canned snapshot.

---

## Running locally

```sh
npm install
npm run dev
```

Routes worth visiting:

- `/` — Review & Confirm (the main screen)
- `/calls/active` — Active call mock
- `/calls/history` — Previous calls table
- `/calls/complete/maya-chen` — Synced screen (after a sync, or empty fallback)

---

## Next steps

### Add authentication & lock down the database

Lovable Cloud is wired up and two tables exist (`calls`, `call_fields`),
but **row-level security is currently open** — anyone with the anon key can
read or write any row. This is intentional for the prototype; it is **not
safe for production**.

Before shipping:

1. Add authentication (email/password + Google sign-in is the default).
2. Replace the open RLS policies on `calls` and `call_fields` with policies
   scoped to `owner_id = auth.uid()` (and join through `call_id` for
   `call_fields`).
3. Set `owner_id` on insert from the authenticated user.
4. Migrate the existing `localStorage` reads/writes in `useReviewState`
   and `useSyncedPayload` over to the database.
