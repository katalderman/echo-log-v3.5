# Pulse — AI Call Review for Salesforce

Pulse is a concept prototype for a Salesforce-native review layer that turns
post-call CRM logging from a 4-minute manual chore into a ~20-second
confirmation step. Sales reps get an AI-drafted snapshot of their Zoom call
and confirm (or skip) seven structured fields before anything syncs to
Salesforce.

This repo is the front-end prototype: four screens, designed in the
Salesforce Lightning visual language, wired with realistic constraint logic
(loading, empty, and error states) so the flow can be demoed end-to-end.

---

## Hypothesis

> Sales reps will trust and adopt CRM logging if the system drafts the work
> for them and asks them to **review and confirm** rather than **type and
> remember**.

Two beliefs underneath that:

1. **The bottleneck isn't capture, it's transcription.** Zoom already
   records the call and produces a transcript. Reps hate retyping that
   into Salesforce fields.
2. **Trust requires control.** AI drafts must never silently write to the
   CRM. Every field must be human-confirmed (or explicitly skipped) before
   sync. The rep is the system of record; the AI is a draft author.

The product is designed to make confirmation cheap and skipping safe — so
the rep stays in charge without paying the manual-entry tax.

---

## Scenario

The walkthrough centers on a single deal:

- **Rep:** Jordan Reyes (AE)
- **Contact:** Maya Chen, Director of RevOps at Northwind Robotics
- **Call:** 24-minute Zoom discovery call, ended 12 minutes ago
- **Stakes:** $72K ACV, Q2 implementation, two open objections (SSO/audit
  logs, Pipedrive migration), CFO Marcus Lee owns budget

Pulse has already drafted a one-paragraph summary and seven CRM fields
from the transcript. Jordan lands on the review screen, scans the AI's
work, confirms or skips each field, and syncs the record.

---

## Key Screens

| Route | Screen | Purpose |
|---|---|---|
| `/calls/active` | **Active Call** | In-call companion — live brief, talk-track suggestions, objection prompts. |
| `/` | **Review & Confirm** (the heart of the product) | AI-drafted summary + 7 CRM fields. Rep confirms, skips, or edits each one. |
| `/calls/complete/:id` | **Post-Sync** | Confirmation that the record synced, plus the rep's review queue and pipeline impact. |
| `/calls/history` | **Previous Calls** | Searchable, filterable history of synced and drafted calls. |

Each screen ships with three constraint states surfaced via a dev-only
"Simulate state" pill: `loading`, `empty`, `error`. No dead-end errors —
every error state offers a recovery action.

---

## User Flow

```text
Zoom call ends
      │
      ▼
  AI Drafted        ← summary + 7 fields generated from transcript
      │
      ▼
Ready for Review    ← rep lands on /
      │
      ▼
For each of 7 fields:  Confirm  ──or──  Skip ("AI got it wrong; don't sync")
      │
      ├── At any point: Save as Draft → returns to queue, progress preserved
      │
      ▼
All fields resolved (confirmed or skipped)
      │
      ▼
Confirm & Sync to Salesforce  ← modal: last-mile inline edits allowed
      │
      ▼
Synced → /calls/complete/:id
```

The rep has exactly three actions on the review screen: **Confirm All
Fields**, **Save as Draft**, **Confirm & Sync to Salesforce**. The
status Path component above is read-only — it reflects state, it does
not trigger it.

---

## Main Build Decisions

### 1. Confirm-or-skip, never silent-sync
Every AI-drafted field requires an explicit decision. Skipping is a
first-class action with its own visual treatment (muted, strikethrough,
"won't sync" pill) and counts toward the gate that unlocks the sync
button. This protects rep trust: if the AI is wrong, the rep can opt
out of that field without abandoning the whole record.

### 2. Salesforce Lightning visual language
Same color palette, card chrome, typography, and Path component patterns
reps already know. The product feels like a Salesforce surface, not a
third-party bolt-on. All colors live as HSL tokens in `index.css` and
`tailwind.config.ts` — no hardcoded color classes in components.

### 3. The Path is read-only status
Earlier iterations had a "Mark Status as Complete" button on the Path
component. Removed — it created two competing commit surfaces. The Path
now reflects state automatically; the header buttons are the action
surface.

### 4. The sync modal is a correction surface, not a preview
Reps who spot an error at the last second can fix it inline in the
"Sync to Salesforce?" modal without losing their place. Inline edits
do not auto-save — the **Confirm & Sync** button remains the only
commit action.

### 5. Drafts persist via `localStorage`
**Save as Draft** writes to `pulse:drafts` and returns the rep to their
queue. The Complete screen surfaces drafts at the top of the team queue
with a "Resume" affordance, so partial reviews are never lost.

### 6. Constraint logic on every screen
Each screen has loading, empty, and error states tethered to specific
rules: minimum 400ms loading durations to avoid flicker, persistent
nav rail in every error state, and at least one recovery action
(Retry, Refresh, Clear Filters, Open in Salesforce) on every error.
A `StateControls` dev pill lets you trigger each path during demo.

### 7. Voice amendments as a diff, not an overwrite
The "Click to record voice note" affordance produces a proposed diff
across affected fields. The rep applies or discards — the AI never
silently rewrites confirmed values.

---

## Tech Stack

- **Framework:** React 18 + Vite 5 + TypeScript 5
- **Styling:** Tailwind CSS v3 with HSL design tokens
- **UI primitives:** shadcn/ui (Radix under the hood)
- **Routing:** react-router-dom
- **State:** React local state + `localStorage` for drafts (no backend yet)
- **Notifications:** sonner

No backend is wired up — this is a front-end prototype. Lovable Cloud
can be enabled later for real persistence, auth, and the Salesforce
integration layer.

---

## Running Locally

```bash
npm install
npm run dev
```

Open the preview, then use the **Simulate state** pill at the top-right
of each screen to walk through loading / empty / error paths.
