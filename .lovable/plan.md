## Goal

Rebuild Pulse from a dark, voice-first capture tool into a **Salesforce Lightning–native review layer** that turns existing AI meeting summaries (Zoom/Teams/Granola) into confirmed CRM data. Voice becomes amendment, not capture.

## Strategic shift

- **Old hypothesis:** Reps want a faster way to record and capture calls.
- **New hypothesis:** Reps already have AI summaries — they need a low-friction *review and confirm* layer that looks native to Salesforce.
- **New kill switch:** Trust. If reviewers expand source quotes for every field, AI summaries aren't trusted enough → kill.

## Design system overhaul

Replace the dark/coral theme with the Salesforce Lightning palette in `index.css` and `tailwind.config.ts`:

- App canvas `#F3F3F3`, cards `#FFFFFF` with `#DDDBDA` 1px borders
- Nav rail navy `#032D60`, primary blue `#0176D3`
- Text slate `#181818`, secondary `#706E6B`
- Status: success `#2E844A`, warning `#FE9339`, error `#EA001E`
- Sans-serif system stack (SF Pro / Salesforce Sans / Inter); drop Instrument Serif display font
- Tighter radii (~4px), subtle shadows only — no glow, no gradients

## App shell (new layout)

```text
┌──┬───────────────────────────────────────────────────────────┐
│  │  TopBar: search · help · notif · avatar                   │
│N ├───────────────────────────────────────────────────────────┤
│a │  Breadcrumb tab row: Calls / Active Review: Maya Chen [x] │
│v ├───────────────────────────────────────────────────────────┤
│  │  Stat banner (Today's Review Queue, 3 tiles)              │
│R ├───────────────────────────────────────────────────────────┤
│a │  Page header: avatar · title · [Skip][Save][Confirm&Sync] │
│i ├───────────────────────────────────────────────────────────┤
│l │  PATH component (AI Captured › Review › Confirmed › Synced)│
│  ├──────────────┬───────────────────────┬────────────────────┤
│  │ About this   │  AI Summary &         │ Activity Timeline  │
│  │ Call         │  CRM Fields (7)       │ + Pipeline Review  │
│  │              │  + Amendment input    │   Preview          │
│  └──────────────┴───────────────────────┴────────────────────┤
│                          To Do List footer bar               │
└──────────────────────────────────────────────────────────────┘
```

## Components to build (in `src/components/pulse/`)

1. `NavRail.tsx` — 60px navy rail with Home / Calls (active) / Contacts / Accounts / Pipeline / Settings
2. `TopBar.tsx` — white bar, centered Lightning-style search, right-side icon cluster + avatar
3. `BreadcrumbTabs.tsx` — `Calls / Active Review: Maya Chen — Northwind Robotics` with closeable tab
4. `StatBanner.tsx` — light blue tinted banner with 3 white stat tiles
5. `RecordHeader.tsx` — teal phone-icon avatar, "Call Review" eyebrow, name title, action buttons (Confirm & Sync = filled blue primary)
6. `Path.tsx` — segmented chevron path: AI Captured ✓ › Ready for Review (active) › Fields Confirmed › Synced to CRM, with "Mark Status as Complete" button
7. `AboutCard.tsx` (left col) — collapsible sections: Meeting Source (Zoom · 24m 18s · date · recording), Contact Details, Deal Context; inline-edit pencil icons on hover
8. `AISummaryPanel.tsx` (center) — attribution strip, editable summary block, hero info-quote card, Confirm All button
9. `FieldCard.tsx` ×7 — label, AI value, trust dot (green/amber/red), expandable "View source" with transcript quote, per-field Confirm button
10. `AmendmentInput.tsx` — rich-text toolbar (B/I/S/link/list/numbered), textarea, secondary "Hold to record voice note" button (voice = amendment), diff preview after voice
11. `ActivityTimeline.tsx` (right) — filter pill row, filters strip, refresh/expand-all, grouped sections with chevrons, 5–6 prior calls
12. `PipelineReviewPreview.tsx` (right) — kill-switch view: how this call renders in a manager forecast meeting
13. `TodoFooter.tsx` — thin dark-gray collapsed footer bar

## State and mocked data

Single page (`src/pages/Index.tsx`) renders the Maya Chen — Northwind Robotics review.

State:
- `reviewQueue` (12 mocked calls; current = Maya Chen)
- `summary` (editable string, prefilled)
- `fields[7]` each `{ label, value, confidence: 'high'|'med'|'low', source: string, confirmed: bool }`
- `pathStep` (0–3)
- `expandedSources: Set<string>` (used to validate kill switch)
- `amendment` rich-text state + voice diff result

Interactions:
- Per-field "Confirm" → checkmark, increments confidence; "Confirm All" → all 7 at once → advances Path to "Fields Confirmed"
- "Confirm & Sync" → advances to "Synced to CRM", success toast "Synced to Salesforce in 22s"
- "View source" expands inline transcript quote
- Voice amendment (mocked) → highlights changed fields in light-blue diff state
- Hero info-quote callout above summary: "Zoom already gives me a summary. Why am I retyping it into Salesforce?"
- Supporting quotes rotate in empty timeline state / Pipeline Preview

## Files to remove or replace

- Rewrite `src/index.css` (Lightning tokens, drop dark theme + gradients + glow)
- Update `tailwind.config.ts` (system font stack, no Instrument Serif, no Inter required)
- Replace `src/pages/Index.tsx` with the new shell composing the components above
- Keep shadcn primitives; restyle via tokens only

## Validation hooks (built into the UI)

- "22s avg review time" stat (vs 4.5min manual) on the banner
- Trust-indicator dots + collapsible source quotes — directly test the new kill switch
- Pipeline Review Preview card — keeps the original kill switch (forecast-grade data) alive
- Confirm All flow optimized for the <30s, ≥5/7 fields target

## Out of scope (per brief)

No auth, no settings, no analytics dashboard, no real Zoom/Teams APIs, no record-a-call primary flow, no marketing hero, no non-Lightning visual language.
