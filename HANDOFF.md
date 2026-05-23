# Pulse — Engineering Handoff

> **For the engineer inheriting this project.** This document tells you what's real, what's mocked, what's broken, and what to ship first. Read top-to-bottom; it's ordered by what you need to know to make a decision in your first hour, your first day, and your first sprint.

---

## TL;DR

Pulse is a Salesforce-Lightning-styled review layer that turns AI-generated meeting summaries into confirmed CRM data. A sales rep ends a Zoom call, lands on the Review screen, confirms seven AI-drafted fields, and clicks Sync. The CRM gets clean, structured, rep-approved data — without anyone having retyped a meeting transcript.

The prototype is real where it matters for testing the trust hypothesis (Supabase data layer, three-role RLS, full auth flow, production-grade error handling) and mocked where the test doesn't require real infrastructure (Salesforce writes, meeting-platform OAuth, AI summary generation, voice transcription).

**The one thing to fix first:** replace the mocked Salesforce sync with a real Salesforce write integration. Everything else in this document can be deferred. The Salesforce write cannot. See [Start Here](#start-here) at the bottom.

---

## Start Here

**The #1 technical priority for Day 1: replace the mocked Salesforce sync with a real Salesforce write integration.**

This is the single piece of work that determines whether Pulse becomes a real product or remains a credible prototype. Everything else — the seven CRM fields, the trust indicators, the consent modal, the auto-save drafts — exists to support this one moment, and right now that moment is a 3-step animated overlay with no payload leaving Pulse's database.

The work involves four steps in dependency order:

**1. OAuth handshake with the customer's Salesforce instance.** Not a one-day task — it requires negotiating OAuth scopes (`api` minimum, likely `refresh_token` and `offline_access` for long-lived sessions), provisioning a Connected App in the customer's Salesforce org, and storing the resulting tokens encrypted at rest. Start with a single design-partner customer rather than building a multi-tenant OAuth flow from scratch.

**2. Field mapping.** Pulse's seven fields (Outcome, Next Step, Decision Maker, Budget Signal, Timeline, Objections, Sentiment) are opinionated. The customer's Salesforce instance has its own field schema with custom fields, validation rules, and required-field enforcement. The integration needs a configuration layer mapping each Pulse field to a target Salesforce field per customer, with the ability to skip fields that don't exist in the target instance. Without this layer, the integration breaks the moment it touches a non-standard Salesforce org.

**3. Write semantics and rollback.** Pulse currently flips `calls.status = 'synced'` *before* a real Salesforce write would occur. The production version needs a two-phase commit: write to Salesforce first, then on success flip the Pulse status; on failure surface the existing `"Sync failed — record is currently locked by another user. Your draft is saved"` error state (already designed in the M3 Behavior chain) and leave the call in `drafted` state for retry. The infrastructure for this error path exists in the UI; the engineer just needs to wire it to a real failure source.

**4. Verification and observability.** After a real Salesforce write, the existing `"Synced, but verification timed out"` amber-banner state needs to be wired to a real verification call: read the record back from Salesforce within 5 seconds of write, confirm field values match what Pulse wrote, and trip the banner if the read fails or returns unexpected values. This handles the "succeeded but can't confirm" distributed-systems case the UI was designed for.

**Why this is the right Day 1 priority:** every other gap in this document (denormalized contacts table, missing audit log, brittle provider CHECK constraint, no rate limiting) can be solved incrementally without touching the core user experience. The Salesforce write cannot. It's the only mocked element that, when real, fundamentally changes what Pulse *is* — from a review surface that pretends to update a CRM into a review surface that actually does. The kill switch this build was designed to test (do reps trust AI drafts enough to confirm without verifying?) cannot be answered until reps see real CRM data flowing from their confirmations.

**Effort estimate:** 3–4 engineer-weeks for a single-customer integration with one design partner. 8–12 engineer-weeks to generalize for multi-tenant use across arbitrary Salesforce orgs. Recommend starting single-tenant and converting once a second customer is live.

**What NOT to prioritize on Day 1, despite temptation:** rebuilding the schema to split contacts/accounts/deals; adding the `audit_log` table; implementing real OAuth flows for the meeting platforms. All of these are real production gaps, but none of them are blocking the kill-switch test. Ship the Salesforce write first; refactor schema once you have one real customer using it.

---

## Functional Truth

### What's operational

These are real and engineer-ready. You can trust them, build on them, and reference them as the baseline.

**Data layer (Supabase via Lovable Cloud).** Ten application tables exist with enforced foreign keys, type-checked enum constraints, and Row-Level Security policies on every public table. All hardcoded seed data has been removed from the codebase — the file `src/data/calls.ts` no longer exists, and every screen's data flows through React Query hooks in `src/lib/queries.ts`.

**Authentication.** The `/auth` route handles email/password sign-up, sign-in, and Google OAuth via Lovable Cloud's managed provider. The `<AuthGate>` component wraps the router and redirects unauthenticated traffic. On first signup, the `handle_new_user()` Postgres trigger creates a `profiles` row with a computed display name and inserts a `('user_id', 'rep')` row into `user_roles`. The TopBar reads `profiles.initials` for the authenticated user rather than the prototype's hardcoded `"JR"`.

**Three-role RLS.** The `app_role` enum (`'admin'`, `'manager'`, `'rep'`) is enforced through a security-definer function `public.has_role(_user_id uuid, _role app_role)` that all policies reference to avoid recursive RLS. The four open `"Prototype: anyone can..."` policies have been dropped. Cross-user data isolation has been verified through a two-account smoke test (`rep_a@test.dev` vs `rep_b@test.dev`) plus a `pg_policies` audit confirming no `USING (true)` policies remain.

**Error, offline, and session handling.** A global `MutationCache.onError` handler routes every write failure to a sonner toast with a Retry action that re-runs the exact failed mutation with original variables — no mutation fails silently. The `OfflineBanner` subscribes to `window.online`/`offline` events and triggers `queryClient.invalidateQueries()` on reconnect. A custom `pulse:auth-expired` event is dispatched by both `AuthGate` and the React Query `QueryCache` on 401 or JWT-expired responses, centralizing session-expiry redirects. Loading skeletons are gated through `useDelayedFlag(..., 600)` so fast or cached fetches don't flash skeleton state.

### What's mocked

These are visual or behavioral simulations, not real systems. Treat them as design surfaces, not infrastructure.

**Meeting platform ingestion (Zoom, Teams, Granola, Google Meet, Otter).** The `meeting_integrations` table tracks which providers each user has marked as connected, and the Import Modal UI behaves as if real OAuth handshakes occurred, but no actual transcript-fetch infrastructure exists.

**AI summary generation and field extraction.** The seven `call_fields` rows per call are pre-populated as static seed data rather than generated by an LLM against a real transcript. The `call_fields.original_value`, `confidence`, and `source_quote` columns are all populated by hand-curated mock data designed to look like LLM output.

**Salesforce write.** The Sync Modal renders a 3-step animated overlay (validating permissions → writing fields → logging activity) that simulates the latency and feedback of a real CRM write, but no data actually leaves the Supabase database. The `calls.status` field flips from `drafted` to `synced` in Pulse's own database; nothing reaches Salesforce.

**Active Call live session.** The Active Call screen's elapsed timer is real (driven by `call_sessions.started_at`), but no actual Zoom session is being monitored. The "connection dropped" state is triggered manually for testing rather than detected from a real meeting platform's webhook.

**Voice transcription on amendments.** Clicking "Record voice note" runs a `setTimeout` and returns canned diff data rather than calling a real speech-to-text API.

**Pipeline Review Preview push.** The Synced screen renders forecast-grade summary data, but the "push to manager dashboard" action is visual confirmation only; there is no aggregation layer feeding a real sales manager's forecast view.

---

## Integrations & Data Model

### Active integrations

| Integration | Status | Notes |
|---|---|---|
| Lovable Cloud (Supabase Postgres) | Live | Full schema with RLS; primary data store |
| Supabase Auth | Live | Email/password + Google OAuth; managed by Lovable Cloud |
| GitHub | Live | Auto-sync on every Lovable response; commits in `main` |
| Zoom / Teams / Granola / Google Meet / Otter | Mocked | UI tiles in Import Modal; no real OAuth handshake |
| Salesforce | Mocked | 3-step animated sync overlay; no actual API integration |
| Speech-to-text (voice amendments) | Mocked | `setTimeout` returns canned diffs |

There are no third-party API endpoints currently being called from the application code. All data flows are Supabase reads/writes through the React Query hooks in `src/lib/queries.ts`.

### Hook inventory

The complete list of operational data hooks:

| Hook | Reads / writes |
|---|---|
| `useCallsQueue()` | `calls` (in_review / drafted / draft_saved) |
| `usePreviousCalls()` | `calls` (synced) |
| `useDraftCalls()` | `calls` (drafted / draft_saved) |
| `useCall(slug)` | `calls` by slug |
| `useCallFields(id)` | `call_fields` |
| `useCallBrief(id)` | `call_briefs` |
| `useCallTimeline(id)` | `call_timeline_items` |
| `useCallSession(id)` | `call_sessions` |
| `useReviewMetrics()` | `review_metrics` |
| `useUpdateCallField(callId)` | updates one `call_fields` row |
| `useSaveDraft()` | sets `calls.status = 'draft_saved'` |
| `useSyncCall()` | persists edits and sets `calls.status = 'synced'` |
| `useMeetingIntegrations()` | `meeting_integrations` for the current user |
| `useToggleIntegration()` | upserts a `meeting_integrations` row |

### Database schema

```
calls
├── id                 uuid PK
├── owner_id           uuid FK → auth.users(id)
├── slug               text (URL-safe identifier)
├── contact_id         uuid FK → contacts(id)
├── call_date          timestamptz
├── duration_seconds   int
├── outcome            enum call_outcome (Qualified/Booked/Discovery/
│                                          NoAnswer/Voicemail/Lost)
├── status             enum call_status (in_review/drafted/draft_saved/synced)
├── summary            text  (AI-drafted narrative)
├── fields_total       int   (default 7)
├── fields_confirmed   int
├── fields_skipped     int
├── synced_at          timestamptz
├── review_started_at  timestamptz
└── created_at, updated_at

call_fields
├── id                 uuid PK
├── call_id            uuid FK → calls(id) on delete cascade
├── field_key          text (outcome/next/dm/budget/timeline/objections/sentiment)
├── label              text
├── value              text  (post-edit)
├── original_value     text  (pre-edit AI draft, preserves lineage)
├── confidence         enum field_confidence (high/med/low)
├── source_speaker     text
├── source_ts          text  (transcript timestamp)
├── source_quote       text  (supporting transcript snippet)
├── confirmed          bool
├── skipped            bool
├── edited             bool
├── position           int   (display order)
└── created_at, updated_at

profiles
├── id            uuid PK = auth.users(id)
├── display_name  text  (from signup metadata or email local-part)
├── initials      text  (computed at signup)
├── team_id       uuid  (for manager team-scope and "Top 5% on team" widget)
└── created_at

user_roles
├── id        uuid PK
├── user_id   uuid FK → auth.users(id)
├── role      enum app_role (admin/manager/rep)
└── UNIQUE(user_id, role)

contacts
├── id              uuid PK
├── owner_id        uuid FK → auth.users(id)
├── full_name       text, title, email, phone
├── account_name    text  (denormalized — see Known Gaps)
├── stage           text
└── amount_cents    bigint (denormalized — see Known Gaps)

call_briefs (pre-call context for Active Call screen)
├── id                  uuid PK
├── call_id             uuid FK → calls(id)
├── account_context     text
├── last_touchpoint     text
└── talking_points      jsonb (array)

call_timeline_items (relationship history shown on Review screen)
├── id              uuid PK
├── call_id         uuid FK
├── item_type       enum (call/email/task/note)
├── title, when_label, description
└── occurred_at     timestamptz

call_sessions (live Zoom state for Active Call screen)
├── id                    uuid PK
├── call_id               uuid FK
├── platform              text
├── started_at            timestamptz
├── status                enum (live/dropped/ended)
└── connection_lost_at    timestamptz

review_metrics (monthly aggregates per user)
├── id                uuid PK
├── user_id           uuid FK
├── period_start      date
├── calls_reviewed    int
├── seconds_saved     int
└── pct_unedited      numeric (0–100)

meeting_integrations (per-user provider connections)
├── id                uuid PK
├── user_id           uuid FK → auth.users(id) on delete cascade
├── provider          text CHECK IN ('zoom','teams','google_meet','granola','otter')
├── status            text CHECK IN ('connected','disconnected') default 'disconnected'
├── connected_at      timestamptz
├── last_synced_at    timestamptz
└── UNIQUE(user_id, provider)
```

### RLS policy model

Every table is scoped. Role checks route through `public.has_role(uuid, app_role)` (security-definer) to prevent recursive RLS evaluation.

| Table | Read | Write |
|---|---|---|
| `calls` | owner OR team-manager (via `profiles.team_id`) OR admin | owner OR admin |
| `call_fields` | inherits via `calls` parent | inherits via `calls` parent |
| `call_briefs`, `call_sessions`, `call_timeline_items` | inherits via `calls` parent | inherits via `calls` parent |
| `contacts` | owner OR admin | owner OR admin |
| `meeting_integrations` | self OR admin | self OR admin |
| `review_metrics` | self OR manager OR admin | self OR admin |
| `profiles` | any authenticated user | self only |
| `user_roles` | self OR admin | admin only |

---

## Edge Cases & Known Gaps

### Handled correctly — tested and shipped

**Offline scenarios.** Sticky `OfflineBanner` that adapts the `QueryErrorCard` to a `WifiOff` icon and disables Retry while disconnected, preventing users from hammering a dead network. On reconnect, `queryClient.invalidateQueries()` refetches stale data without a page reload.

**Session expiry.** Centralized through a custom `pulse:auth-expired` event dispatched by both `AuthGate` (on `SIGNED_OUT` or failed `TOKEN_REFRESHED`) and the React Query `QueryCache` (on 401, `PGRST301`, or "jwt expired" messages). Users see a toast and redirect to `/auth`; no stale-session writes occur.

**Database write failures.** Global `MutationCache.onError` handler toasts the error with a Retry action capable of re-running the exact failed mutation with original variables. Every mutation in the app — `useUpdateCallField`, `useSaveDraft`, `useSyncCall`, `useToggleIntegration` — flows through this pattern. No mutation fails silently.

**Database read failures.** Shared `QueryErrorCard` component (full-card AlertCircle, "Couldn't reach Pulse" message, request ID, Retry button) renders on every screen that fetches data. Retry calls the hook's `refetch()` and disables itself while in flight.

**Empty states.** Distinct and intentional. Today's Review Queue empty state ("Your queue is clear") differs from the brand-new-user state on Previous Calls ("You haven't reviewed any calls yet"). Filter-mismatch empty states on Previous Calls preserve the user's stats card; brand-new empty states hide it. Each empty state offers a relevant CTA rather than a dead end.

**Loading skeletons.** Gated behind a 600ms minimum delay via `useDelayedFlag(..., 600)`, eliminating skeleton flash on fast or cached fetches. Manual `StateControls` overrides bypass the delay for demo inspection.

**Cross-user data isolation.** Enforced at the database level via RLS, with the application UI rendering a "Call not found" state rather than a server error when RLS denies access. A direct devtools console query as `rep_b` against `rep_a`'s `call_fields` returns an empty array — verified.

**Duplicate-write race conditions.** Sync flow uses an in-flight guard plus button-disable state, so rapid clicks on "Confirm & Sync" fire exactly one `update calls set status='synced'` request regardless of click count.

### Known gaps — production blockers and refactor needs

**Denormalized deal fields on `contacts`.** The `stage`, `amount_cents`, and `account_name` columns live on `contacts` for prototype convenience. In production, a contact can have multiple deals and a company can have multiple contacts; these need to split into separate `accounts` and `deals` tables with foreign-key relationships, with `contacts` reduced to person-level data only. **First schema refactor an engineer should plan for after the Salesforce integration ships.**

**No audit log.** The `call_fields.original_value` column preserves the pre-edit AI draft, but there is no record of *who* edited a field, *when*, or whether they reverted. For any production deployment with compliance requirements (SOC 2, ISO 27001), this audit trail is non-negotiable. Add an `audit_log` table with `(id, table_name, row_id, field_name, old_value, new_value, changed_by, changed_at)` and a Postgres trigger on every mutation.

**Brittle provider CHECK constraint.** `meeting_integrations.provider` enforces five values via a CHECK constraint. Adding a sixth provider requires a database migration. Production should either lift this to a `meeting_providers` lookup table or accept any string with format validation.

**OAuth tokens are not stored.** The `meeting_integrations` table tracks connection status but not the credentials needed to actually fetch transcripts. A production version requires an encrypted token storage column (or, better, a separate `oauth_tokens` table referenced by foreign key) with proper key-rotation handling.

**`review_metrics` has no aggregation job.** The table is currently populated only via prototype seed data; there is no automated aggregation. In production, this requires either a scheduled Postgres function running nightly or a real-time materialized view refreshed on `calls.status` transitions.

**No rate limiting on mutations.** A misbehaving client could in principle hammer the database with rapid `useUpdateCallField` calls. Production needs either Supabase rate-limit policies or application-side throttling on the React Query mutations.

**`owner_id` enforcement varies by mutation path.** `useMeetingIntegrations` reads `auth.uid()` at call time, but `useSaveDraft`, `useUpdateCallField`, and `useSyncCall` rely on the `owner_id` having been stamped at row creation. If a future feature ever lets one user modify another's call (e.g., a manager edit-on-behalf), the mutation paths will need explicit `owner_id` checks rather than relying on RLS to deny inappropriately scoped writes.

### Untested but ship-blocking

**`handle_new_user` trigger with mixed auth providers.** Tested with email/password signup but not with Google OAuth. Edge case: a user signs up with Google and then later tries to sign in with email/password using the same email address — current behavior is undefined. Needs test coverage before public launch.

**Path component rollback on partial sync failure.** The Path lifecycle (`Call Ended → AI Drafted → Ready for Review → Fields Confirmed → Synced to Salesforce`) has been tested for the happy path, but not for partial failures where `status='synced'` writes succeed in Pulse but the (mocked) Salesforce write conceptually fails. When the Salesforce mock becomes real, this rollback path needs design.

**`useDelayedFlag` skeleton race condition.** Tested for fast fetches and slow fetches independently, but not for fetches that resolve, error, and refetch within the 600ms window. Theoretical race where skeleton state could flicker. Low priority, but worth a unit test before real production traffic.

---

## Repository Navigation

For an engineer who's just cloned the repo and wants to find their way around.

### File structure

```
src/
├── App.tsx                       # routes only
├── main.tsx
│
├── components/
│   ├── shell/                    # Cross-feature layout chrome
│   │   ├── Shell.tsx             #   NavRail, TopBar, BreadcrumbTabs
│   │   ├── StateControls.tsx     #   Demo state toggles + Skeleton
│   │   ├── OfflineBanner.tsx     #   Online/offline detection
│   │   └── QueryErrorCard.tsx    #   Shared error fallback
│   └── ui/                       # shadcn/ui primitives
│
├── features/                     # Each folder is a self-contained screen
│   ├── review/                   # /  — Review & Confirm (the HUB)
│   │   ├── ReviewPage.tsx        #     display: composes the layout
│   │   ├── useReviewState.ts     #     state + persistence
│   │   ├── data.ts               #     types only (seed data removed)
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
│   ├── auth/                     # /auth + AuthGate
│   │   ├── AuthPage.tsx
│   │   └── AuthGate.tsx
│   └── not-found/                # *
│       └── NotFoundPage.tsx
│
├── lib/
│   ├── queries.ts                # ALL React Query hooks for Supabase
│   ├── authEvents.ts             # pulse:auth-expired event bus
│   ├── useOnlineStatus.ts        # window.online/offline subscription
│   └── useDelayedFlag.ts         # 600ms skeleton gating
│
├── hooks/                        # Generic hooks (use-toast, use-mobile)
└── integrations/supabase/        # Supabase client + types

supabase/
└── migrations/                   # All schema migrations (review here first
                                  # to understand the database evolution)
```

### Architectural rules

These are conventions the codebase enforces. Breaking them tends to introduce bugs.

- **Display is dumb.** Page components receive props and render. No network calls, no timers — those belong in hooks. If you need to fetch data on a page, add a hook to `src/lib/queries.ts` and call it from the page.
- **State lives in `useXxxState` hooks.** `useReviewState` owns every field, draft, voice-amendment, and sync handler for `/`. Swapping the backend means rewriting one hook, not five screens.
- **Data is a module, not a hook.** Shared types live in `features/<name>/data.ts` so they can be imported from anywhere without import cycles. Seed data has been removed from these files — they contain types only.
- **Group by feature, not by type.** A new screen = a new folder under `features/` with its own page, hook, types, and any local components. Promote a component to `components/shell/` only if two features share it.
- **Mutations flow through `MutationCache.onError`.** Every write should be a TanStack Query mutation, not a direct `supabase.from(...).update(...)` call from a component. The global error handler depends on this pattern.

### Routes

| Route | Component | Purpose |
|---|---|---|
| `/` | `ReviewPage` | Review & Confirm 7 fields — the hub |
| `/auth` | `AuthPage` | Sign in / sign up / Google OAuth |
| `/calls/active` | `ActiveCallPage` | Pre-call brief during a live Zoom |
| `/calls/complete/:id` | `SyncedPage` | Post-sync confirmation, also doubles as read-only history view |
| `/calls/history` | `PreviousCallsPage` | Searchable archive of synced calls |
| `*` | `NotFoundPage` | Fallback |

### Running locally

```bash
npm install
npm run dev
```

The app will redirect any unauthenticated route to `/auth`. Create a test account (use `+pulse` in the email address for easy filtering: `you+pulse@yourdomain.com`), verify the email, and you're in.

To verify RLS isolation across users locally, sign up two test accounts and follow the verification procedure documented below in [Auth & access control verification](#auth--access-control-verification).

### Auth & access control verification

The README's RLS proof procedure, summarized:

1. Sign up `rep_a@test.dev` and `rep_b@test.dev` from `/auth`. Each gets a `profiles` row + a `'rep'` row in `user_roles` via `handle_new_user`.
2. Verify the email for both accounts.
3. As `rep_a`, create at least one call (any insert via the app — `owner_id` is stamped from `auth.uid()`).
4. As `rep_b`, open `/calls/history` — `rep_a`'s call must **not** appear.
5. From the browser devtools console while signed in as `rep_b`, run:

```javascript
const { data, error } = await supabase
  .from("call_fields")
  .select("id, call_id, label, value");
console.log({ data, error });
```

`data` must contain only rows from calls `rep_b` owns. `rep_a`'s rows are filtered by the `Call fields readable when parent call is` policy.

### Programmatic checks in place

- `supabase--linter` reports no critical findings. The one `WARN` on `has_role` is intentional and documented — `has_role` is the recursion-safe helper used by every policy.
- `pg_policies` shows every `public.*` table is scoped by `auth.uid()`, `has_role(..., 'admin')`, or team-manager visibility via `profiles.team_id`. No `USING (true)` policies remain.

---

## Cleanup Notes

A history of what was removed from the prototype during the M5 hardening pass, kept here so an engineer doesn't go looking for things that intentionally don't exist.

- `src/data/calls.ts` has been removed. All call/queue/field data now flows through `src/lib/queries.ts` against Lovable Cloud.
- The `Outcome` display union lives in `src/lib/queries.ts`.
- Persona quotes from the Review screen prototype have moved into the README's "Research context" section. They are product positioning context, not runtime data, and should not be seeded into the database.
- `PROTOTYPE_USER_ID` has been removed from `src/lib/queries.ts`. All user-scoped reads/writes now resolve `auth.uid()` at call time.

---

## Document History

| Version | Date | Notes |
|---|---|---|
| v1.0 | Module 4 | Auto-generated handoff from Lovable's M4 Engineering Handoff prompt |
| v2.0 | Module 5 | Merged with Functional Truth / Data Model / Edge Cases / Start Here sections after backend hardening |

---

## License

Prototype — not licensed for production use. The framework, prompts, validation approach, and engineering patterns are free to adapt.
