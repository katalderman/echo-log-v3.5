# Pulse — Product Requirements Document

> AI-drafted CRM logging that sales reps actually trust, because every field
> is reviewed and confirmed (or skipped) before it lands in Salesforce.

---

## 1. What it does

Pulse listens to a sales call (Zoom today; Gong / Meet / phone later),
auto-drafts the seven CRM fields a rep would otherwise have to remember and
type, and presents them in a **Review & Confirm** screen. The rep confirms,
edits, or skips each field, then syncs to Salesforce in one action. Drafts
are preserved, voice amendments can be added after the call, and every
synced field carries a citation back to the moment in the transcript it
came from.

Pulse is **not** an auto-logger. The rep is always in the loop.

## 2. Who it's for

- **Primary user** — Account Executives and SDRs running 4–8 discovery /
  qualification calls per day on Zoom, who already use Salesforce but log
  inconsistently because typing notes after every call is the worst part of
  their job.
- **Secondary user** — RevOps and front-line sales managers who depend on
  clean pipeline data for forecasting and coaching but currently get
  whatever the rep remembered to type at 6 PM Friday.
- **Persona in the prototype** — Jordan Reyes, AE, reviewing a 24-minute
  Zoom call with Maya Chen at Northwind Robotics ($72K ACV, Q2 close).

## 3. The problem

CRM hygiene is broken because the unit cost of logging a call (4–5 min of
typing while context-switching) exceeds the perceived per-call benefit to
the rep. The rep loses; the manager loses; the forecast lies.

Existing AI note-takers either (a) dump a transcript into a notes field
nobody reads, or (b) silently auto-write fields the rep never saw —
destroying trust the first time something is wrong. Reps then turn the
integration off.

Pulse's bet: reps will adopt AI logging **if and only if** they keep
control. Confirm-or-skip on every field, every time. No silent sync.

## 4. Hypothesis

> If a rep can review a call's CRM fields in under 30 seconds — with AI
> drafts they can confirm, edit, or skip individually, and a clear sync
> action they trigger themselves — they will log every call, and pipeline
> data quality will rise without any change to manager workflows.

Falsifiable signals:
- Reps complete review in < 60s median (target 30s).
- ≥ 80% of calls reach **Synced** status within 24h of call end.
- Skip rate stays below 15% per field — too high means drafts are bad,
  too low means reps are rubber-stamping.
- Manager-side forecast amendments drop month-over-month.

## 5. Key metrics

| Metric | Definition | Target |
|---|---|---|
| Time-to-sync | Call end → Synced to Salesforce | Median < 60s |
| Review completion rate | Synced calls ÷ total calls | ≥ 80% in 24h |
| Per-field skip rate | Skipped ÷ presented, by field | 5–15% band |
| Per-field edit rate | Edited in sync modal ÷ confirmed | < 20% (drafts are good) |
| Draft resume rate | Drafts resumed ÷ drafts saved | ≥ 70% within 48h |
| Verification timeout rate | Sync OK but post-write verify failed | < 2% |
| Trust signal | Reps who turn the integration off in week 1 | < 5% |

## 6. Screens

All screens live in a Salesforce Lightning–style shell (`NavRail`,
`TopBar`, `BreadcrumbTabs`) and share the same **Path** component as a
read-only status indicator: *Call Ended → AI Drafted → Ready for Review →
Fields Confirmed → Synced to Salesforce*.

### 6.1 Active Call — `/calls/active`
**Purpose.** In-call surface. Confirms Pulse is listening, shows live
duration, exposes a stop control. Sets the rep's expectation that a draft
will be ready the moment the call ends.
**States.** `recording`, `transcribing`, `error` (Zoom disconnect).

### 6.2 Review & Confirm — `/` (the heart of the product)
**Purpose.** The one screen the hypothesis lives or dies on. Rep sees:
- The AI summary (editable, must be reviewed).
- Seven AI-drafted fields: Outcome, Next step, Decision maker, Budget,
  Timeline, Objections, Sentiment. Each card shows the value, a citation
  ("Maya Chen at 21:08" + quote, expandable), and **Confirm** / **Skip**.
- Voice amendment chip — record a 10-second note after the call; Pulse
  diffs it against the existing fields and shows proposed changes (never
  silent).
- A header action surface with three actions: **Confirm All Fields**,
  **Save as Draft**, **Confirm & Sync to Salesforce** (gated until every
  field is either confirmed or skipped).
**States.** `loading` (AI drafting), `normal`, `voice-amendment-pending`,
`error` (transcript missing).

### 6.3 Sync Modal (overlay on Review)
**Purpose.** Last-mile correction surface. Shows only the fields the rep
chose to sync (skipped fields excluded). Each row is inline-editable and
revertable. Header reflects exact counts: *"N fields (M skipped), 1
summary, 1 voice note will be added to Maya Chen's contact record."*
Confirming runs a 3-step animated write (validate → write → log activity)
with a simulated-error path for QA.
**States.** `idle`, `syncing`, `error`, `success`.

### 6.4 Synced — `/calls/complete/:id`
**Purpose.** Reinforce the loop. Show what just got written, prove time
saved, surface the next call. Header is success-state with timestamp.
Center column reflects exactly what was synced — confirmed fields with
citations, **Edited in sync** chips where the rep changed values in the
modal, and a separate **Skipped — not synced** block listing what was
deliberately omitted. Right column previews the manager's pipeline view
("Live in Manager Dashboard"). Bottom nudges the rep into the team queue
(or shows "all caught up").
**States.** `loading` (pipeline push), `normal`, `verification-error`
(synced but post-write check timed out — observability gap, not a failed
write), `empty queue`, `history` (read-only when viewed from previous
calls).

### 6.5 Previous Calls — `/calls/history`
**Purpose.** Auditable log of every synced call. Read-only entry into
Synced view per row. Used by managers and by reps preparing for a
follow-up.

### 6.6 Not Found — `*`
Routes that don't match. Recovery action back to queue.

## 7. User flow

```
┌─────────────────┐
│  Zoom call ends │
└────────┬────────┘
         │  AI drafts fields + summary (~2s)
         ▼
┌──────────────────────────────────────────────┐
│  Review & Confirm  (/)                       │
│                                              │
│  For each of 7 fields:                       │
│     ├─ Confirm  ─────────┐                   │
│     └─ Skip ─────────────┤                   │
│                          ▼                   │
│  All 7 resolved? ──No──► (loop)              │
│         │ Yes                                │
│         ▼                                    │
│  Header unlocks: Confirm & Sync              │
└────┬───────────────────┬─────────────────────┘
     │                   │
     │ Save as Draft     │ Confirm & Sync
     ▼                   ▼
┌─────────────┐   ┌──────────────────────┐
│ Queue with  │   │ Sync Modal           │
│ progress    │   │ (edit / revert any   │
│ preserved   │   │  field, then run     │
└─────────────┘   │  3-step write)       │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Synced               │
                  │ /calls/complete/:id  │
                  │ → Review next call   │
                  └──────────────────────┘
```

Side branches the flow has to handle:
- **Voice amendment** at any time during review — proposed diff, never
  auto-applied.
- **Verification timeout** on the Synced screen — the write succeeded but
  read-back failed; surface as a soft warning with "Open in Salesforce".
- **Resume from draft** — a saved draft appears in the team queue with a
  *Draft · X of 7 confirmed* pill and Resume button.

## 8. Build decisions

1. **Confirm-or-skip, never silent-sync.** Trust is the entire bet. The
   Path component is read-only on purpose — the only commit surface is
   the header + sync modal.
2. **Skipped ≠ confirmed-empty.** Skipping a field records intent ("AI
   was wrong, don't write this") and is shown explicitly on the Synced
   screen. The sync modal and counts everywhere reflect skipped state.
3. **Sync modal is the last correction surface.** Inline edits there are
   tagged **Edited in sync** on the post-sync view so the rep can see
   what they amended at the wire.
4. **Drafts persist locally** (`localStorage: pulse:drafts`) and the
   actual sync payload is persisted (`pulse:synced:maya-chen`) so the
   Synced screen can render exactly what happened, not a canned summary.
5. **Citations on every field.** Every draft links back to "speaker @
   timestamp" + quote. This is the load-bearing feature that makes Skip
   meaningful — a rep can see *why* the AI drafted what it drafted.
6. **Salesforce Lightning visual language.** HSL semantic tokens in
   `index.css`, no raw colors in components, success / warning / info
   states match Lightning conventions so reps don't feel like they
   left their CRM.
7. **State controls are visible during the prototype.** Each screen
   exposes `<StateControls>` to toggle loading / empty / error states for
   demoing constraint behavior. These are removed in production.
8. **Voice amendments as a diff, not a rewrite.** Pulse never overwrites
   a confirmed field from voice — it proposes a change that re-opens
   that field for re-confirmation.
9. **Manager dashboard is a preview, not an integration yet.** Right
   column on Synced shows what *will* go to managers, not a real
   bi-directional sync.

## 9. Mocked vs. real

| Area | Status | Notes |
|---|---|---|
| UI / interaction model | **Real** | React 18 + Vite 5 + TS, Tailwind v3, shadcn/ui. All screens, states, transitions, and the sync modal are functional. |
| Routing | **Real** | `react-router-dom`, all routes wired. |
| Field review state machine | **Real** | Confirm / Skip / edit-in-sync logic, gated sync action, progress counters, all live. |
| Drafts | **Real (local)** | Persisted in `localStorage` under `pulse:drafts`. Cleared on successful sync. |
| Synced payload | **Real (local)** | Persisted in `localStorage` under `pulse:synced:maya-chen` so the Synced screen reflects actual review decisions. |
| Toasts / notifications | **Real** | `sonner`. |
| Zoom ingestion | **Mocked** | No Zoom API. Active Call screen is a visual stub. |
| AI drafting | **Mocked** | Seed fields and summary are hard-coded for Maya Chen / Northwind. No model call. |
| Voice amendment transcription | **Mocked** | 1.4s timer then a canned diff against two fields. |
| Salesforce write | **Mocked** | 3-step animation in the sync modal; no Salesforce API. Simulated error path is a toggle. |
| Verification (post-write read-back) | **Mocked** | `verifyState` toggle on the Synced screen. |
| Manager pipeline view | **Mocked** | Right-column preview is static; no manager dashboard exists. |
| Auth / multi-user | **Not built** | Single-rep prototype. |
| Backend | **Not built** | No Lovable Cloud / Supabase yet. All state is local. |
| Previous calls history | **Mocked** | Static `PREVIOUS_CALLS` seed; routes through the same Synced view in read-only mode. |
| Salesforce deep links | **Mocked** | "View in Salesforce" / "Open in Salesforce" buttons are non-navigational. |

## 10. Out of scope (this prototype)

- Real Zoom / Gong / Meet ingestion and diarization.
- Real LLM drafting and prompt evaluation.
- Real Salesforce OAuth, field mapping, and write API.
- Multi-tenant auth, RBAC, manager dashboard.
- Mobile / tablet layouts (desktop-only for now).
- Bulk review (queue-level confirm).
- Localization.

## 11. What ships next (if the hypothesis holds)

1. Replace the mocked AI draft with a real model call against the call
   transcript; keep the citation contract.
2. Real Salesforce write with field-mapping config and a real verify step.
3. Replace `localStorage` with Lovable Cloud so drafts and history follow
   the rep across devices.
4. Manager dashboard as a first-class screen, fed by the same sync events.
5. Zoom ingestion and a real Active Call surface.

---

*Last updated alongside the prototype at `/calls/complete/maya-chen`.*
