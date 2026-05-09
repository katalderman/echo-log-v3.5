export type Outcome = "Qualified" | "Booked" | "No Answer" | "Voicemail" | "Discovery" | "Lost";

export type CallRecord = {
  id: string;
  contact: string;
  company: string;
  title: string;
  date: string;
  duration: string;
  outcome: Outcome;
  fieldsConfirmed: number;
  fieldsTotal: number;
  syncedAt: string | null;
  reviewed: boolean;
  amount?: string;
};

export const REVIEW_QUEUE: CallRecord[] = [
  { id: "maya-chen", contact: "Maya Chen", company: "Northwind Robotics", title: "Director of RevOps", date: "Apr 28, 2026", duration: "24m 18s", outcome: "Qualified", fieldsConfirmed: 0, fieldsTotal: 7, syncedAt: null, reviewed: false, amount: "$72,000" },
  { id: "ravi-patel", contact: "Ravi Patel", company: "Helix Bio", title: "VP Sales Ops", date: "Apr 28, 2026", duration: "31m 02s", outcome: "Discovery", fieldsConfirmed: 0, fieldsTotal: 7, syncedAt: null, reviewed: false, amount: "$45,000" },
  { id: "emma-watts", contact: "Emma Watts", company: "Brightline Logistics", title: "CRO", date: "Apr 28, 2026", duration: "18m 44s", outcome: "Booked", fieldsConfirmed: 0, fieldsTotal: 7, syncedAt: null, reviewed: false, amount: "$120,000" },
];

export const PREVIOUS_CALLS: CallRecord[] = [
  { id: "p1", contact: "Daniel Park", company: "Atlas Freight", title: "Head of RevOps", date: "Apr 27, 2026", duration: "22m 11s", outcome: "Qualified", fieldsConfirmed: 7, fieldsTotal: 7, syncedAt: "Apr 27, 4:12 PM", reviewed: true, amount: "$68,000" },
  { id: "p2", contact: "Priya Shah", company: "Lumen Health", title: "Director of Sales", date: "Apr 27, 2026", duration: "29m 03s", outcome: "Booked", fieldsConfirmed: 7, fieldsTotal: 7, syncedAt: "Apr 27, 2:45 PM", reviewed: true, amount: "$95,000" },
  { id: "p3", contact: "Tomás Reyes", company: "Vector Cloud", title: "CFO", date: "Apr 26, 2026", duration: "19m 27s", outcome: "Qualified", fieldsConfirmed: 6, fieldsTotal: 7, syncedAt: "Apr 26, 5:30 PM", reviewed: true, amount: "$54,000" },
  { id: "p4", contact: "Hana Sato", company: "Northwind Robotics", title: "Sales Engineer", date: "Apr 25, 2026", duration: "12m 02s", outcome: "Discovery", fieldsConfirmed: 5, fieldsTotal: 7, syncedAt: "Apr 25, 11:08 AM", reviewed: true, amount: "$0" },
  { id: "p5", contact: "Liam O'Brien", company: "Forge Analytics", title: "VP Marketing", date: "Apr 24, 2026", duration: "00m 38s", outcome: "Voicemail", fieldsConfirmed: 2, fieldsTotal: 7, syncedAt: "Apr 24, 3:14 PM", reviewed: true },
  { id: "p6", contact: "Aisha Khan", company: "Northstar Cyber", title: "CISO", date: "Apr 23, 2026", duration: "00m 00s", outcome: "No Answer", fieldsConfirmed: 0, fieldsTotal: 7, syncedAt: "Apr 23, 9:22 AM", reviewed: true },
  { id: "p7", contact: "Marco Bianchi", company: "Helix Bio", title: "Procurement Lead", date: "Apr 22, 2026", duration: "27m 41s", outcome: "Qualified", fieldsConfirmed: 7, fieldsTotal: 7, syncedAt: "Apr 22, 4:55 PM", reviewed: true, amount: "$72,000" },
  { id: "p8", contact: "Sophie Laurent", company: "Brightline Logistics", title: "Ops Manager", date: "Apr 21, 2026", duration: "16m 18s", outcome: "Lost", fieldsConfirmed: 7, fieldsTotal: 7, syncedAt: "Apr 21, 1:03 PM", reviewed: true, amount: "$0" },
];

export const CONFIRMED_FIELDS = [
  { label: "Call outcome", value: "Qualified — moving to security review", source: "Maya Chen at 21:08" },
  { label: "Next step", value: "Send SOC 2 + sandbox access by Fri Apr 30", source: "Maya Chen at 22:41" },
  { label: "Decision maker", value: "Marcus Lee (CFO) — budget; Maya — technical", source: "Maya Chen at 11:14" },
  { label: "Budget signal", value: "$60–80K ACV envelope confirmed", source: "Maya Chen at 13:02" },
  { label: "Timeline", value: "Q2 2026 implementation; 60-day procurement", source: "Maya Chen at 14:32" },
  { label: "Objections", value: "SSO/audit logs + Pipedrive migration", source: "Maya Chen at 17:22" },
  { label: "Sentiment", value: "Positive — exec air-cover from CEO", source: "Maya Chen at 23:55" },
];
