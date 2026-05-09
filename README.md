# Pulse

**An AI review layer that turns meeting transcripts into confirmed Salesforce data — without changing the CRM reps already use.**

> "Zoom already gives me a summary. Why am I retyping it into Salesforce?"
> — Senior AE, the user we built this for

---

## TL;DR

A $2M internal CRM tool stalled at 18% adoption. Reps had AI summaries from Zoom, Teams, and Granola — but still spent 4.5 minutes manually retyping them into Salesforce. The CEO was one all-hands away from buying Gong. The CTO would not allow CRM replacement.

**Pulse is the layer that goes on top.** Instead of asking reps to *capture* calls, it lets them *review and confirm* AI-drafted CRM fields in under 30 seconds. Voice becomes amendment, not capture.

🔗 **Live prototype:** _https://id-preview--6a219f6a-adac-4120-90e3-d9dd5c1f66a9.lovable.app_

---

## The Problem

| Metric | Reality |
|---|---|
| CRM adoption rate | **18%** weekly active users (target: 50%) |
| Daily active reps | 11 of 200 |
| Avg time to log a call | 4.5 minutes |
| Calls logged per rep per day | 0.8 (most go unlogged) |
| Fields completed per entry | 3.2 of 9 required |
| Annual rep turnover | 34% (institutional knowledge walks out the door) |
| Bulk-update behavior | 67% of logging happens the night before quarterly reviews |

Reps already have AI meeting summaries. They don't need another capture tool — they need a low-friction way to turn those summaries into structured CRM data. Three rounds of training had near-zero attendance. The diagnosis: **the review step is the blocker, not the capture step.**

---

## The Hypothesis

> **If** we replace manual data entry with an AI-drafted review layer that looks native to Salesforce,
> **then** daily logged calls per rep increase from **0.8 → 3+**,
> **because** reps already trust AI summaries — they just won't spend 4.5 minutes retyping them into 9 CRM fields.

| | |
|---|---|
| **Risk Type** | Usability + trust |
| **Fidelity** | Clickable flow in Salesforce visual language |
| **Validated If** | A rep confirms 5+ of 7 AI-drafted fields in under 30 seconds **AND** the data renders as forecast-grade in Pipeline Review Preview |

---

## The Kill Switch

The single assumption that, if wrong, kills the entire concept:

> **Reps won't trust AI-drafted fields without seeing the source transcript.**
> If reviewers expand source quotes for every field, the AI summary isn't trusted enough — reps will revert to manual entry, and the CEO's Gong instinct wins.

To test this directly, every field card includes:
- A **confidence dot** (green / amber / red) at a glance
- An expandable **"View source"** link that reveals the exact transcript quote behind each draft
- A **Pipeline Review Preview** that simulates how this call renders in a manager forecast meeting

If reps expand sources for every field, the hypothesis dies fast.

---

## Key Screens

### 1. Review Queue (Stat Banner)
Today's queue, average review time, and team adoption rate — surfaced in the Salesforce-native blue banner.

### 2. Record Header
Teal phone-icon avatar, "Call Review" eyebrow, contact name (Maya Chen), and real-time sync status. Primary action: **Confirm & Sync**.

### 3. Path Component
A 5-step chevron path showing lifecycle state: **Call Ended → AI Drafted → Ready for Review → Fields Confirmed → Synced to CRM**. Reps advance by confirming fields.

### 4. About This Call (Left Column)
Collapsible sections for Meeting Source (Zoom · 24m 18s), Contact Details, and Deal Context. Inline-edit on hover.

### 5. AI Summary & CRM Fields (Center Column)
The core review surface:
- **Editable AI summary** with a "Reviewed" toggle
- **7 field cards**: Outcome, Next Step, Decision Maker, Budget Signal, Timeline, Objections, Sentiment
- Each card: AI-drafted value, confidence dot, per-field Confirm button, expandable source transcript quote
- **Confirm All** button for sub-30-second flow

### 6. Amendment Input (Bottom Center)
Rich-text toolbar + textarea for manual edits. Secondary "Hold to record voice note" button. Voice amendments highlight affected fields in diff state before application.

### 7. Activity Timeline (Right Column)
Filterable timeline of prior calls, emails, and tasks with Maya Chen. Shows the full relationship history so reps review in context.

### 8. Pipeline Review Preview (Right Column)
Kill-switch view: simulates how this confirmed call appears in a sales manager's forecast meeting. Tests whether the data is forecast-grade.

### 9. Import Modal
Three-tab modal for bringing in transcripts: **Paste transcript**, **Upload audio**, or **Connect source** (Zoom / Teams / Google Meet).

---

## User Flow

A sales rep interacts with Pulse in 8 steps:

1. **Receives notification** — "Maya Chen call ready for review" (AI drafted from Zoom)
2. **Opens the review** — lands on the native-looking Lightning page with pre-filled context
3. **Skims the AI summary** — editable, marked as reviewed with one click
4. **Reviews 7 field cards** — scans confidence dots; expands "View source" only when skeptical
5. **Confirms fields** — individually or all-at-once with "Confirm All"
6. **Optionally amends** — rich text or voice note; diff preview shows what would change
7. **Syncs to Salesforce** — one-click "Confirm & Sync"; success toast: "Synced in 2.3s"
8. **Views activity timeline** — prior calls with this contact for full context before next outreach

**Target:** Complete review in <30 seconds, ≥5/7 fields confirmed without expanding every source quote.

---

## Main Build Decisions

### Visual Language: Salesforce Lightning Native
- **Why:** Reps resist "new tools to learn." A Salesforce-native skin removes adoption friction.
- **Palette:** Canvas `#F3F3F3`, white cards with `#DDDBDA` 1px borders, nav rail `#032D60`, primary blue `#0176D3`
- **Typography:** System sans-serif stack (Salesforce Sans / SF Pro / Segoe UI / Roboto)
- **Radii/shadows:** Tight 4px radius, subtle shadows only — no glow, no gradients

### Component Architecture
The app shell is composed of focused, single-purpose components:

| Component | Responsibility |
|---|---|
| `NavRail` | 60px navy rail with Home / Calls / Contacts / Accounts / Pipeline |
| `TopBar` | Lightning-style search bar + help / settings / notifications / avatar |
| `BreadcrumbTabs` | Contextual tab row: Calls / Active Review: Maya Chen |
| `StatBanner` | Queue metrics + Import / Connect actions |
| `RecordHeader` | Identity, sync status, primary actions |
| `Path` | 5-step chevron lifecycle with status-complete button |
| `AboutCard` | Collapsible meeting source, contact, deal context |
| `SummaryBlock` | Editable AI summary with reviewed toggle |
| `FieldCard` | Label + AI value + confidence dot + source quote + confirm |
| `AmendmentInput` | Rich text + voice note recorder + diff preview |
| `ActivityTimeline` | Filterable relationship history |
| `PipelineReviewPreview` | Manager forecast-view simulation (kill switch) |
| `SyncModal` | Final confirmation before CRM commit |
| `ImportModal` | Paste / upload / connect transcript sources |

### State Management
Single-page architecture with local React state (no backend in prototype):

- `fields[7]` — each with `label`, `value`, `confidence`, `source` transcript quote, `confirmed` bool
- `summary` — editable string, prefilled from AI
- `pathStep` — 0–4 lifecycle tracking
- `expandedSources` — Set of field keys where source quotes are expanded (kill-switch telemetry)
- `amendment` / `voiceDiff` — rich text state + voice note diff highlighting

### Validation Hooks Built Into the UI

| Hook | What It Tests |
|---|---|
| "22s avg review time" stat | Speed hypothesis: is review faster than 4.5min manual? |
| Trust dots + expandable sources | Trust hypothesis: do reps confirm without verifying every quote? |
| Pipeline Review Preview | Data quality hypothesis: is confirmed data forecast-grade? |
| Confirm All flow | Friction hypothesis: can reps complete review in <30s, ≥5/7 fields? |

---

## How to Run Locally

This project was built with [Lovable](https://lovable.dev) and exported to GitHub.

```bash
# Clone
git clone <this-repo-url>
cd <repo-name>

# Install
npm install

# Run dev server
npm run dev
```

Or open the project directly in Lovable to continue iterating with prompts.

---

## Built With

- **[Lovable](https://lovable.dev)** — AI-native prototyping
- **React 18 + Vite** — UI framework and build tool
- **Tailwind CSS** — Utility-first styling with Salesforce design tokens
- **TypeScript** — Type safety
- **shadcn/ui** — Base component primitives
- **Lucide React** — Iconography

---

## About This Project

Built as the Module 2 deliverable for **[Product School's Vibe Coding Certification](https://productschool.com)**. The course is structured around a "Confidence Line" — the idea that prototypes should be used to systematically kill ambiguity and replace it with evidence, rather than to ship polished features.

This prototype tests a strategic pivot:
- **Old hypothesis:** Reps want a faster way to capture calls (voice-first)
- **New hypothesis:** Reps already have AI summaries — they need a low-friction *review and confirm* layer that looks native to Salesforce

Every UI element exists to validate one of these assumptions. The kill switch is built into the product itself via source-quote expansion tracking and Pipeline Review Preview.

---

## License

Prototype — not licensed for production use. The framework, prompt, and validation approach are free to adapt.
