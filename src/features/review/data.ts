// Seed data + types for the Review & Confirm screen.
// Pure data — no React, no side effects. Easy to swap with a real API later.

export type Confidence = "high" | "med" | "low";

export type FieldKey =
  | "outcome"
  | "next"
  | "dm"
  | "budget"
  | "timeline"
  | "objections"
  | "sentiment";

export type Field = {
  key: FieldKey;
  label: string;
  value: string;
  confidence: Confidence;
  source: { speaker: string; ts: string; quote: string };
  confirmed: boolean;
  skipped?: boolean;
};

export type TimelineItem = {
  type: "call" | "email" | "task" | "note";
  title: string;
  when: string;
  desc: string;
};

export type TimelineGroup = { title: string; items: TimelineItem[] };

export const SEED_SUMMARY =
  "Maya Chen (Director of RevOps at Northwind Robotics) is evaluating Pulse to replace their stalled internal CRM-logging tool. Decision involves CFO Marcus Lee for budget; Maya holds technical sign-off. Procurement window is 60 days, target implementation Q2. Two open objections: SSO/audit logging requirements and migration path from Pipedrive. Maya asked for a security review and a sandbox account by Friday. Sentiment positive — she has internal exec air-cover from the CEO.";

export const SEED_FIELDS: Field[] = [
  {
    key: "outcome", label: "Call outcome", value: "Qualified — moving to security review",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "21:08", quote: "This solves the exact problem we just spent six months failing to solve internally. Send me what your security team needs." },
  },
  {
    key: "next", label: "Next step", value: "Send SOC 2 + sandbox access by Fri Apr 30",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "22:41", quote: "If you can get me the SOC 2 report and a sandbox by Friday, I can have it in front of Marcus on Monday." },
  },
  {
    key: "dm", label: "Decision maker", value: "Marcus Lee (CFO) — budget; Maya — technical",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "11:14", quote: "I own the technical decision but Marcus, our CFO, has to sign off on anything over fifty grand." },
  },
  {
    key: "budget", label: "Budget signal", value: "$60–80K ACV envelope confirmed",
    confidence: "med", confirmed: false,
    source: { speaker: "Maya Chen", ts: "13:02", quote: "We had eighty thousand earmarked for the rebuild. If you come in under that, it's an easier conversation." },
  },
  {
    key: "timeline", label: "Timeline", value: "Q2 2026 implementation; 60-day procurement",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "14:32", quote: "We're looking at Q2 for implementation, though our procurement cycle is usually 60 days." },
  },
  {
    key: "objections", label: "Objections", value: "SSO/audit logs + Pipedrive migration",
    confidence: "med", confirmed: false,
    source: { speaker: "Maya Chen", ts: "17:22", quote: "Two things will kill this — if you can't do SAML SSO with audit logs, and if there's no clean migration off Pipedrive." },
  },
  {
    key: "sentiment", label: "Sentiment", value: "Positive — exec air-cover from CEO",
    confidence: "high", confirmed: false,
    source: { speaker: "Maya Chen", ts: "23:55", quote: "Honestly, our CEO is the one pushing this. He saw a competitor demo and won't stop talking about it." },
  },
];

export const TIMELINE_GROUPS: TimelineGroup[] = [
  {
    title: "Upcoming & Overdue",
    items: [
      { type: "task", title: "Send SOC 2 + sandbox access", when: "Due Apr 30", desc: "Promised on today's call. Owner: you." },
    ],
  },
  {
    title: "April 2026",
    items: [
      { type: "call", title: "Discovery — Pricing & Procurement", when: "Apr 28 · 24m", desc: "Confirmed Q2 timeline, Marcus Lee owns budget. Two objections raised." },
      { type: "email", title: "Re: Pulse demo follow-up", when: "Apr 21", desc: "Maya: 'Looped in Marcus. Let's do 30 min next week.'" },
      { type: "call", title: "Demo — Pulse review layer", when: "Apr 14 · 32m", desc: "Walked through Salesforce-native UI. Maya: 'This is exactly what we built and failed at.'" },
      { type: "note", title: "Pre-call brief", when: "Apr 14", desc: "Northwind tried building this internally — 18% adoption. CEO threatening to buy Gong." },
      { type: "call", title: "Intro — referred by Helix Bio", when: "Apr 03 · 18m", desc: "Maya, ex-Stripe RevOps. Burned by Salesforce 2023 rollout. Skeptical of new tools." },
    ],
  },
];

export type SyncRow = {
  key: string;
  label: string;
  value: string;
  original: string;
  edited: boolean;
};

