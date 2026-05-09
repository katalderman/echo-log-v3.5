-- Enums
CREATE TYPE public.call_outcome AS ENUM ('Qualified', 'Booked', 'No Answer', 'Voicemail', 'Discovery', 'Lost');
CREATE TYPE public.call_status AS ENUM ('drafted', 'in_review', 'draft_saved', 'synced', 'failed');
CREATE TYPE public.field_confidence AS ENUM ('high', 'med', 'low');

-- calls: one row per sales call
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID,
  contact_name TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  call_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  outcome public.call_outcome,
  status public.call_status NOT NULL DEFAULT 'drafted',
  amount_cents BIGINT,
  summary TEXT,
  fields_total INTEGER NOT NULL DEFAULT 7,
  fields_confirmed INTEGER NOT NULL DEFAULT 0,
  fields_skipped INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_owner ON public.calls(owner_id);
CREATE INDEX idx_calls_date ON public.calls(call_date DESC);

-- call_fields: the seven AI-drafted CRM fields per call
CREATE TABLE public.call_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  original_value TEXT NOT NULL,
  confidence public.field_confidence NOT NULL DEFAULT 'med',
  source_speaker TEXT,
  source_ts TEXT,
  source_quote TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  edited BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (call_id, field_key)
);

CREATE INDEX idx_call_fields_call ON public.call_fields(call_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER calls_set_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER call_fields_set_updated_at
  BEFORE UPDATE ON public.call_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS — prototype mode (open access). Tighten when auth lands.
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prototype: anyone can read calls"
  ON public.calls FOR SELECT USING (true);
CREATE POLICY "Prototype: anyone can insert calls"
  ON public.calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Prototype: anyone can update calls"
  ON public.calls FOR UPDATE USING (true);
CREATE POLICY "Prototype: anyone can delete calls"
  ON public.calls FOR DELETE USING (true);

CREATE POLICY "Prototype: anyone can read call_fields"
  ON public.call_fields FOR SELECT USING (true);
CREATE POLICY "Prototype: anyone can insert call_fields"
  ON public.call_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Prototype: anyone can update call_fields"
  ON public.call_fields FOR UPDATE USING (true);
CREATE POLICY "Prototype: anyone can delete call_fields"
  ON public.call_fields FOR DELETE USING (true);