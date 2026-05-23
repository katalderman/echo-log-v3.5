# Pulse Prompt Library

This document captures the three-phase prompt logic used to build Pulse in Claude/v0. Each section explains the intent behind the prompt structure, followed by the full prompt text.

---

## Step 1 — Expand

Pulse's expansion prompts always begin with a fixed product context block that encodes the mission, the strategic constraint, and the operating mode. This block stays consistent across every Expand call so the AI carries forward the product's positioning rather than rediscovering it each time. The anchor logic is structured in three layers: who Pulse is built for (mid-market B2B sales reps with 18% CRM adoption), what Pulse cannot do (replace the CRM — must layer on top), and how Pulse operates (review mode for completed calls, import mode for off-platform transcripts). Every screen the AI builds inherits these constraints, which is what keeps the prototype from drifting into a generic SaaS app.

### Prompt

```
You're a Senior PM at a mid-market SaaS company. $45M ARR, Series C,
200-person sales team across 3 offices + remote. The internal CRM
note-taking tool has stalled at 18% adoption — reps prefer Google Docs
and text messages. With 34% annual turnover, institutional knowledge
walks out the door every quarter. The CEO is one all-hands away from
buying Gong. The CTO won't allow CRM replacement; any solution must
LAYER ON TOP of the existing system. The sales team will not attend
training.

The strategic shift: in 2026, sales calls already run on Zoom, Teams,
and Google Meet — all of which produce AI-generated summaries and
full transcripts automatically. Reps are NOT willing to re-narrate
what an AI already captured. Pulse is the REVIEW LAYER that turns
existing AI meeting output into CRM-ready data.

Pulse operates in two modes:
  1. REVIEW MODE — after a call ends, Pulse processes the meeting
     transcript, generates a summary, and pre-fills 7 CRM fields.
     The rep then reviews and confirms before anything syncs to the
     CRM. NOTHING enters the CRM until the rep clicks "Confirm & Sync."
  2. IMPORT MODE — for calls that happened off-platform (Google
     Meet without integration, in-person meetings, recorded phone
     calls), reps paste or upload a transcript and Pulse processes
     it the same way as Review Mode.

EXPAND — Build the next four screens of Pulse in a strict sequence.

Each new screen must inherit the existing Salesforce Lightning chrome
already in this build: deep navy left nav rail (#032D60), Salesforce
blue primary actions (#0176D3), warm light-gray canvas (#F3F3F3),
white cards with #DDDBDA borders. Do NOT redesign the shell — only
build the new center + right column states for each screen.

Build these in order, where each screen depends on the previous as
the upstream state:

  1. ADD A 2ND SCREEN: "In-Progress Call" — pre-call brief view
     during an active Zoom session
  2. ADD A 3RD SCREEN: "Salesforce Sync" — the explicit consent
     moment, modal-or-screen state with editable preview
  3. ADD A 4TH SCREEN: "Complete · Sync Summary" — post-sync
     confirmation with "Review Next Call" nudge
  4. ADD A 5TH SCREEN: "Review Previous Calls" — historical audit
     view, Salesforce-style data table

Build the In-Progress Call screen FIRST as the upstream anchor, then
Salesforce Sync as the commit point, then Complete Summary as the
downstream success state, then Previous Calls as the historical lens
over all of the above. Each later screen should inherit visual
decisions from the earlier ones — do not restart the design language.
```

---

## Step 2 — Behavior

The Behavior prompt is where the prototype becomes a system rather than a sketch. Every screen Pulse builds must handle three failure modes per surface — loading state, empty state, error state — with hard-coded if/then triggers that tether the AI to functional truth rather than letting it invent fallback behaviors. The grounding rules are screen-specific: a connection drop on the Active Call screen surfaces a different message than a connection drop on the Sync modal, because the user's recovery path is different in each case. Critically, every error state must offer a recovery action — no dead-end errors — and every error message attributes failure to the system ("Pulse couldn't..."), never to the user. These rules are what convert Pulse from a happy-path demo into a build a peer reviewer can actually break.

### Prompt

```
BEHAVIOR — Ground the four new screens with constraint logic for
loading, empty, and error states. Apply these rules to each screen
in sequence. Maintain the same Salesforce Lightning design language
throughout. Tether all behavior strictly to these rules.

═══════════════════════════════════════════════════════════════════
SCREEN 1 — In-Progress Call
═══════════════════════════════════════════════════════════════════

LOADING — Pre-Call Brief section: skeleton screens for account
context, last touchpoint, and talking points cards. Use Salesforce
Lightning's pulse animation (subtle gray gradient, 1.4s loop).
Show for 600ms minimum.

EMPTY — When Pulse has no brief data for this contact (new contact,
never called before): "No history with this contact yet. Pulse will
draft full notes after the call ends — for now, just focus on the
conversation."

ERROR — Zoom connection drops mid-call: amber warning strip
replaces the source-of-truth banner with "Lost connection to Zoom
12 seconds ago. Pulse will resume drafting when reconnected. Your
in-call notes are saved locally." Include a "Retry connection" link.
Pulsing teal "ACTIVE CALL" indicator switches to static amber dot.
Do NOT block the rep from continuing manual notes.

═══════════════════════════════════════════════════════════════════
SCREEN 2 — Salesforce Sync
═══════════════════════════════════════════════════════════════════

LOADING — sync-in-progress: replace modal body with three stacked
status rows that resolve in sequence:
  ⏳ "Validating field permissions..." → ✓ (400ms)
  ⏳ "Writing 7 fields to Maya Chen's record..." → ✓ (800ms)
  ⏳ "Logging activity to pipeline..." → ✓ (600ms)
[Cancel] button disabled during sync.

ERROR — Salesforce write fails: red error card "Sync failed.
Maya Chen's record is currently locked by another user. Your draft
is saved — try again in a few minutes." Show [Save Draft & Exit]
and [Retry Sync]. Original modal contents stay visible above the
error. Do NOT advance Path component to "Synced."

═══════════════════════════════════════════════════════════════════
SCREEN 3 — Complete · Sync Summary
═══════════════════════════════════════════════════════════════════

LOADING — "Pipeline Review Preview · Now Live" card: skeleton while
the manager-facing view pushes to team's pipeline dashboard. Resolve
in 1s to green "Live in Manager Dashboard" badge.

EMPTY — "Your team's review queue" card when queue is empty (rep
has cleared all reviews): "You're all caught up. 0 calls awaiting
review. Your pipeline data is current." Salesforce success-green
checkmark. Secondary "Browse previous calls" link.

ERROR — Post-sync verification times out: amber warning strip
"Synced, but verification timed out. Open the contact in Salesforce
to confirm fields landed correctly." Do NOT roll back success state.
Path component still shows "Synced to Salesforce" final state.

═══════════════════════════════════════════════════════════════════
SCREEN 4 — Review Previous Calls
═══════════════════════════════════════════════════════════════════

LOADING — data table: 8 skeleton rows matching column structure.
Filter pill row stays interactive during load.

EMPTY (filters return no results): "No reviewed calls match these
filters. Try expanding the date range or clearing the outcome filter."
[Clear All Filters] + [View This Month] buttons. Right-column
"Your Review Stats" card stays populated.

EMPTY (brand new user, never reviewed): "You haven't reviewed any
calls yet. Once you sync your first call, it'll show up here."
Primary [Go to Today's Queue] button. Hide filter pills and stats.

ERROR — Salesforce query for historical calls fails: red error card
"Couldn't load your call history. Salesforce returned an error.
Your data isn't lost — try refreshing the page." [Refresh] button.

═══════════════════════════════════════════════════════════════════
GLOBAL CONSTRAINTS — apply everywhere:
═══════════════════════════════════════════════════════════════════

- All loading skeletons use the same Salesforce Lightning shimmer
  animation; do not invent a custom one.
- Error states use error red (#EA001E); warning states use amber
  (#FE9339); success states use green (#2E844A). No other status colors.
- Error messages NEVER blame the user. "Pulse couldn't..." or
  "Salesforce returned..." — never "You did..."
- Every error state must offer a recovery action — Retry, Refresh,
  Clear Filters, Open in Salesforce. No dead-end errors.
- Loading states must be at least 400ms even if the underlying call
  is instant — flicker reads as broken.
- The persistent left nav rail and top bar remain interactive in
  every error state. The user is never trapped.
```

---

## Step 3 — Refine

Refine prompts target a single interaction problem identified in a live build, then resolve it with the smallest possible code change. The design system reference is the Salesforce Lightning Design System — its color tokens (#032D60 navy, #0176D3 Salesforce blue, #F3F3F3 canvas, #DDDBDA borders), its component patterns (the Path component as passive status visualization, inline edit pencils, Activity Timeline filter pills), and its action hierarchy (primary filled blue, secondary outlined, destructive red) anchor every Refine call. The most important Refine technique in this build was forcing the AI to audit before fixing — to identify three specific gaps in the current UX as a numbered list, then resolve them surgically. That diagnostic gate is what prevents the AI from "fixing" the wrong problem or quietly redesigning something outside the scope.

### Prompt

```
REFINE — Focus only on the AI Summary & CRM Fields section in the
center column of the review screen. Do not touch any other screen,
component, or part of the project.

The interaction model in this section feels confusing. There are
multiple overlapping confirmation affordances — per-field "Confirm"
buttons, "Draft" pills on some fields, "Confirmed" green state on
others, a "Confirm All Fields" button at the top of the column, and
a "Mark Status as Complete" button in the Path component above. As
a user, I cannot tell which action is required to advance, what
order they should happen in, or what happens if I click the wrong
one first.

STEP 1 — Audit before you fix.
Before changing anything, list the 3 biggest gaps in logic in the
current confirmation flow. Specifically address:

  1. The relationship between per-field Confirm buttons, "Confirm
     All Fields," and "Mark Status as Complete." Which is the
     primary action? Are any redundant?
  2. The Draft / Confirmed / Synced state model. Are the visual
     states consistent across all 7 fields, and do they map cleanly
     to the Path component's lifecycle steps?
  3. The action hierarchy in the page header (Skip / Save Draft /
     Synced) versus the column-level "Confirm All Fields" versus
     the Path-level "Mark Status as Complete." Is there a clear
     primary path, or are reps making three separate decisions?

Output the audit as a numbered list with one sentence per gap before
proposing or making any fix.

STEP 2 — Fix the three gaps.
Once the gaps are identified, resolve them with the smallest possible
changes. The goal is a single clear primary action path: rep reviews
each field → confirms (individually OR via Confirm All) → clicks one
final button to commit. The Path component should reflect state, not
trigger it. "Mark Status as Complete" should either be removed or
collapsed into "Confirm & Sync" — there should not be two separate
buttons that both advance state.

When fixing, preserve:
  - The per-field "From your call" lineage badges
  - The trust indicator dots (green/amber/red)
  - The "View source" links
  - The yellow Draft visual treatment for unconfirmed fields
  - The green Confirmed visual treatment for confirmed fields
  - The Salesforce Lightning design language

Do NOT:
  - Redesign the field cards themselves
  - Change the page header layout or the action button positions
  - Modify the Path component's visual style
  - Touch any other screen, the left column, or the right column

After applying the fixes, briefly note what you changed and which
gap each change resolved.
```
