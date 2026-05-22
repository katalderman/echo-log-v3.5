-- 1. New enums
CREATE TYPE public.timeline_item_type AS ENUM ('call','email','task','note');
CREATE TYPE public.call_session_status AS ENUM ('live','dropped','ended');
CREATE TYPE public.meeting_provider AS ENUM ('zoom','teams','google_meet','granola','otter');
CREATE TYPE public.integration_status AS ENUM ('connected','disconnected');

-- 2. Augment calls with a URL slug so existing routes keep working
ALTER TABLE public.calls ADD COLUMN slug text UNIQUE;

-- 3. profiles (id is NOT FK to auth.users yet — added in Prompt 2)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  initials text NOT NULL,
  team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  full_name text NOT NULL,
  title text,
  email text,
  phone text,
  account_name text,
  stage text,
  amount_cents bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. call_briefs (one per call)
CREATE TABLE public.call_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL UNIQUE REFERENCES public.calls(id) ON DELETE CASCADE,
  account_context text,
  last_touchpoint text,
  talking_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. call_timeline_items
CREATE TABLE public.call_timeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  item_type public.timeline_item_type NOT NULL,
  title text NOT NULL,
  when_label text,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX call_timeline_items_call_id_idx ON public.call_timeline_items(call_id, position);

-- 7. call_sessions (one per call)
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL UNIQUE REFERENCES public.calls(id) ON DELETE CASCADE,
  platform text,
  started_at timestamptz NOT NULL DEFAULT now(),
  status public.call_session_status NOT NULL DEFAULT 'live',
  connection_lost_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. review_metrics
CREATE TABLE public.review_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  calls_reviewed int NOT NULL DEFAULT 0,
  seconds_saved int NOT NULL DEFAULT 0,
  pct_unedited numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

-- 9. meeting_integrations (user_id is NOT FK to auth.users yet)
CREATE TABLE public.meeting_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider public.meeting_provider NOT NULL,
  status public.integration_status NOT NULL DEFAULT 'disconnected',
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- 10. Open RLS on every new table (prototype parity)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','contacts','call_briefs','call_timeline_items',
    'call_sessions','review_metrics','meeting_integrations'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Prototype: anyone can read %1$s"   ON public.%1$I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "Prototype: anyone can insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Prototype: anyone can update %1$s" ON public.%1$I FOR UPDATE USING (true)', t);
    EXECUTE format('CREATE POLICY "Prototype: anyone can delete %1$s" ON public.%1$I FOR DELETE USING (true)', t);
  END LOOP;
END $$;

-- 11. updated_at triggers
CREATE TRIGGER set_profiles_updated_at             BEFORE UPDATE ON public.profiles             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_contacts_updated_at             BEFORE UPDATE ON public.contacts             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_call_briefs_updated_at          BEFORE UPDATE ON public.call_briefs          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_call_sessions_updated_at        BEFORE UPDATE ON public.call_sessions        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_review_metrics_updated_at       BEFORE UPDATE ON public.review_metrics       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_meeting_integrations_updated_at BEFORE UPDATE ON public.meeting_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- SEED — placeholder owner; rebound to auth.uid() in Prompt 2
-- =====================================================================

INSERT INTO public.profiles (id, display_name, initials)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jordan Rivera', 'JR');

INSERT INTO public.review_metrics (user_id, period_start, calls_reviewed, seconds_saved, pct_unedited)
VALUES ('00000000-0000-0000-0000-000000000001', date_trunc('month', now())::date, 47, 47 * 18 * 60, 96);

WITH seed(slug, contact_name, company, title, call_date, duration_seconds, outcome, status, amount_cents, fields_confirmed, fields_total, synced_at) AS (
  VALUES
    ('maya-chen','Maya Chen','Northwind Robotics','Director of RevOps','2026-04-28 14:00+00'::timestamptz, 24*60+18, 'Qualified'::public.call_outcome, 'in_review'::public.call_status, 7200000::bigint, 0, 7, NULL::timestamptz),
    ('ravi-patel','Ravi Patel','Helix Bio','VP Sales Ops','2026-04-28 11:00+00'::timestamptz, 31*60+2, 'Discovery','in_review', 4500000, 0, 7, NULL),
    ('emma-watts','Emma Watts','Brightline Logistics','CRO','2026-04-28 09:30+00'::timestamptz, 18*60+44, 'Booked','in_review', 12000000, 0, 7, NULL),
    ('p1','Daniel Park','Atlas Freight','Head of RevOps','2026-04-27 16:00+00'::timestamptz, 22*60+11, 'Qualified','synced', 6800000, 7, 7, '2026-04-27 16:12+00'::timestamptz),
    ('p2','Priya Shah','Lumen Health','Director of Sales','2026-04-27 14:00+00'::timestamptz, 29*60+3, 'Booked','synced', 9500000, 7, 7, '2026-04-27 14:45+00'),
    ('p3','Tomás Reyes','Vector Cloud','CFO','2026-04-26 17:00+00'::timestamptz, 19*60+27, 'Qualified','synced', 5400000, 6, 7, '2026-04-26 17:30+00'),
    ('p4','Hana Sato','Northwind Robotics','Sales Engineer','2026-04-25 11:00+00'::timestamptz, 12*60+2, 'Discovery','synced', 0, 5, 7, '2026-04-25 11:08+00'),
    ('p5','Liam O''Brien','Forge Analytics','VP Marketing','2026-04-24 15:00+00'::timestamptz, 38, 'Voicemail','synced', NULL, 2, 7, '2026-04-24 15:14+00'),
    ('p6','Aisha Khan','Northstar Cyber','CISO','2026-04-23 09:00+00'::timestamptz, 0, 'No Answer','synced', NULL, 0, 7, '2026-04-23 09:22+00'),
    ('p7','Marco Bianchi','Helix Bio','Procurement Lead','2026-04-22 16:00+00'::timestamptz, 27*60+41, 'Qualified','synced', 7200000, 7, 7, '2026-04-22 16:55+00'),
    ('p8','Sophie Laurent','Brightline Logistics','Ops Manager','2026-04-21 13:00+00'::timestamptz, 16*60+18, 'Lost','synced', 0, 7, 7, '2026-04-21 13:03+00')
)
INSERT INTO public.calls (slug, owner_id, contact_name, company, title, call_date, duration_seconds, outcome, status, amount_cents, fields_confirmed, fields_total, synced_at)
SELECT slug, '00000000-0000-0000-0000-000000000001'::uuid, contact_name, company, title, call_date, duration_seconds, outcome, status, amount_cents, fields_confirmed, fields_total, synced_at
FROM seed;

INSERT INTO public.call_fields (call_id, field_key, label, value, original_value, confidence, source_speaker, source_ts, source_quote, position)
SELECT c.id, f.field_key, f.label, f.value, f.value, f.confidence::public.field_confidence, f.spk, f.ts, f.quote, f.pos
FROM public.calls c, (VALUES
  ('outcome','Call outcome','Qualified — moving to security review','high','Maya Chen','21:08','This solves the exact problem we just spent six months failing to solve internally. Send me what your security team needs.',0),
  ('next','Next step','Send SOC 2 + sandbox access by Fri Apr 30','high','Maya Chen','22:41','If you can get me the SOC 2 report and a sandbox by Friday, I can have it in front of Marcus on Monday.',1),
  ('dm','Decision maker','Marcus Lee (CFO) — budget; Maya — technical','high','Maya Chen','11:14','I own the technical decision but Marcus, our CFO, has to sign off on anything over fifty grand.',2),
  ('budget','Budget signal','$60–80K ACV envelope confirmed','med','Maya Chen','13:02','We had eighty thousand earmarked for the rebuild. If you come in under that, it''s an easier conversation.',3),
  ('timeline','Timeline','Q2 2026 implementation; 60-day procurement','high','Maya Chen','14:32','We''re looking at Q2 for implementation, though our procurement cycle is usually 60 days.',4),
  ('objections','Objections','SSO/audit logs + Pipedrive migration','med','Maya Chen','17:22','Two things will kill this — if you can''t do SAML SSO with audit logs, and if there''s no clean migration off Pipedrive.',5),
  ('sentiment','Sentiment','Positive — exec air-cover from CEO','high','Maya Chen','23:55','Honestly, our CEO is the one pushing this. He saw a competitor demo and won''t stop talking about it.',6)
) AS f(field_key,label,value,confidence,spk,ts,quote,pos)
WHERE c.slug = 'maya-chen';

INSERT INTO public.call_fields (call_id, field_key, label, value, original_value, confidence, source_speaker, source_ts, confirmed, position)
SELECT c.id, f.field_key, f.label, f.value, f.value, 'high'::public.field_confidence,
       split_part(f.source, ' at ', 1), split_part(f.source, ' at ', 2), true, f.pos
FROM public.calls c, (VALUES
  ('outcome','Call outcome','Qualified — moving to security review','Maya Chen at 21:08',0),
  ('next','Next step','Send SOC 2 + sandbox access by Fri Apr 30','Maya Chen at 22:41',1),
  ('dm','Decision maker','Marcus Lee (CFO) — budget; Maya — technical','Maya Chen at 11:14',2),
  ('budget','Budget signal','$60–80K ACV envelope confirmed','Maya Chen at 13:02',3),
  ('timeline','Timeline','Q2 2026 implementation; 60-day procurement','Maya Chen at 14:32',4),
  ('objections','Objections','SSO/audit logs + Pipedrive migration','Maya Chen at 17:22',5),
  ('sentiment','Sentiment','Positive — exec air-cover from CEO','Maya Chen at 23:55',6)
) AS f(field_key,label,value,source,pos)
WHERE c.slug = 'p1';

INSERT INTO public.call_briefs (call_id, account_context, last_touchpoint, talking_points)
SELECT id,
  'Northwind tried building this internally — 18% adoption. CEO threatening to buy Gong.',
  'Demo on Apr 14: "This is exactly what we built and failed at."',
  '["Reference the failed internal build","Confirm Marcus Lee owns budget sign-off","Pre-empt SSO/audit-log objection","Offer sandbox by Friday"]'::jsonb
FROM public.calls WHERE slug = 'maya-chen';

INSERT INTO public.call_sessions (call_id, platform, started_at, status, connection_lost_at)
SELECT id, 'Zoom', now() - interval '12 minutes', 'dropped'::public.call_session_status, now() - interval '12 seconds'
FROM public.calls WHERE slug = 'maya-chen';

INSERT INTO public.call_timeline_items (call_id, item_type, title, when_label, description, occurred_at, position)
SELECT c.id, t.item_type::public.timeline_item_type, t.title, t.when_label, t.description, t.occurred_at::timestamptz, t.pos
FROM public.calls c, (VALUES
  ('task','Send SOC 2 + sandbox access','Due Apr 30','Promised on today''s call. Owner: you.','2026-04-30',0),
  ('call','Discovery — Pricing & Procurement','Apr 28 · 24m','Confirmed Q2 timeline, Marcus Lee owns budget. Two objections raised.','2026-04-28',1),
  ('email','Re: Pulse demo follow-up','Apr 21','Maya: ''Looped in Marcus. Let''s do 30 min next week.''','2026-04-21',2),
  ('call','Demo — Pulse review layer','Apr 14 · 32m','Walked through Salesforce-native UI. Maya: ''This is exactly what we built and failed at.''','2026-04-14',3),
  ('note','Pre-call brief','Apr 14','Northwind tried building this internally — 18% adoption. CEO threatening to buy Gong.','2026-04-14',4),
  ('call','Intro — referred by Helix Bio','Apr 03 · 18m','Maya, ex-Stripe RevOps. Burned by Salesforce 2023 rollout. Skeptical of new tools.','2026-04-03',5)
) AS t(item_type,title,when_label,description,occurred_at,pos)
WHERE c.slug = 'maya-chen';

UPDATE public.calls
SET summary = 'Maya Chen (Director of RevOps at Northwind Robotics) is evaluating Pulse to replace their stalled internal CRM-logging tool. Decision involves CFO Marcus Lee for budget; Maya holds technical sign-off. Procurement window is 60 days, target implementation Q2. Two open objections: SSO/audit logging requirements and migration path from Pipedrive. Maya asked for a security review and a sandbox account by Friday. Sentiment positive — she has internal exec air-cover from the CEO.'
WHERE slug = 'maya-chen';
