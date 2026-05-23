
-- =========================================================================
-- 1. Delete prototype seed rows (placeholder owner)
-- =========================================================================
DO $$
DECLARE
  placeholder uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  DELETE FROM public.call_fields
    WHERE call_id IN (SELECT id FROM public.calls WHERE owner_id = placeholder);
  DELETE FROM public.call_briefs
    WHERE call_id IN (SELECT id FROM public.calls WHERE owner_id = placeholder);
  DELETE FROM public.call_timeline_items
    WHERE call_id IN (SELECT id FROM public.calls WHERE owner_id = placeholder);
  DELETE FROM public.call_sessions
    WHERE call_id IN (SELECT id FROM public.calls WHERE owner_id = placeholder);
  DELETE FROM public.calls WHERE owner_id = placeholder;
  DELETE FROM public.contacts WHERE owner_id = placeholder;
  DELETE FROM public.review_metrics WHERE user_id = placeholder;
  DELETE FROM public.meeting_integrations WHERE user_id = placeholder;
  DELETE FROM public.profiles WHERE id = placeholder;
END$$;

-- =========================================================================
-- 2. Role enum + user_roles table
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'rep');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. has_role() security-definer function
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================================
-- 4. handle_new_user() trigger — auto-create profile + default rep role
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display text;
  v_initials text;
BEGIN
  v_display := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- compute up to 2 uppercase initials from words in display name
  SELECT string_agg(upper(left(word, 1)), '')
    INTO v_initials
  FROM (
    SELECT word FROM regexp_split_to_table(v_display, '\s+') AS word
    WHERE length(word) > 0
    LIMIT 2
  ) s;

  IF v_initials IS NULL OR length(v_initials) = 0 THEN
    v_initials := upper(left(COALESCE(v_display, NEW.email, 'U'), 2));
  END IF;

  INSERT INTO public.profiles (id, display_name, initials)
  VALUES (NEW.id, v_display, v_initials)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'rep')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 5. Drop all "Prototype: anyone can …" policies
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'Prototype:%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- =========================================================================
-- 6. Locked-down policies per Integration Plan §4
-- =========================================================================

-- ---------- profiles ----------
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- user_roles ----------
CREATE POLICY "Users can view own roles or admins all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- calls ----------
CREATE POLICY "Calls visible to owner, team manager, or admin"
  ON public.calls FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'manager')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = calls.owner_id
          AND p.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Owners or admins can insert calls"
  ON public.calls FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can update calls"
  ON public.calls FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can delete calls"
  ON public.calls FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------- call_fields (scoped via parent call) ----------
CREATE POLICY "Call fields readable when parent call is"
  ON public.call_fields FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_fields.call_id
      AND (
        c.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'manager')
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = c.owner_id
              AND p.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
          )
        )
      )
  ));

CREATE POLICY "Call fields writable by call owner or admin"
  ON public.call_fields FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_fields.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Call fields updatable by call owner or admin"
  ON public.call_fields FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_fields.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Call fields deletable by call owner or admin"
  ON public.call_fields FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_fields.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- ---------- call_briefs ----------
CREATE POLICY "Call briefs readable when parent call is"
  ON public.call_briefs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_briefs.call_id
      AND (
        c.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'manager')
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = c.owner_id
              AND p.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
          )
        )
      )
  ));

CREATE POLICY "Call briefs writable by call owner or admin"
  ON public.call_briefs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_briefs.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Call briefs updatable by call owner or admin"
  ON public.call_briefs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_briefs.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Call briefs deletable by call owner or admin"
  ON public.call_briefs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_briefs.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- ---------- call_sessions ----------
CREATE POLICY "Call sessions readable when parent call is"
  ON public.call_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_sessions.call_id
      AND (
        c.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'manager')
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = c.owner_id
              AND p.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
          )
        )
      )
  ));

CREATE POLICY "Call sessions writable by call owner or admin"
  ON public.call_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_sessions.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Call sessions updatable by call owner or admin"
  ON public.call_sessions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_sessions.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Call sessions deletable by call owner or admin"
  ON public.call_sessions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_sessions.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- ---------- call_timeline_items ----------
CREATE POLICY "Timeline items readable when parent call is"
  ON public.call_timeline_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_timeline_items.call_id
      AND (
        c.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'manager')
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = c.owner_id
              AND p.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
          )
        )
      )
  ));

CREATE POLICY "Timeline items writable by call owner or admin"
  ON public.call_timeline_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_timeline_items.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Timeline items updatable by call owner or admin"
  ON public.call_timeline_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_timeline_items.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Timeline items deletable by call owner or admin"
  ON public.call_timeline_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calls c
    WHERE c.id = call_timeline_items.call_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- ---------- contacts ----------
CREATE POLICY "Contacts visible to owner or admin"
  ON public.contacts FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can insert contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can update contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners or admins can delete contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------- review_metrics ----------
CREATE POLICY "Metrics visible to self, manager, or admin"
  ON public.review_metrics FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users insert own metrics; admins any"
  ON public.review_metrics FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own metrics; admins any"
  ON public.review_metrics FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own metrics; admins any"
  ON public.review_metrics FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------- meeting_integrations ----------
CREATE POLICY "Users manage own integrations (select)"
  ON public.meeting_integrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own integrations (insert)"
  ON public.meeting_integrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own integrations (update)"
  ON public.meeting_integrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own integrations (delete)"
  ON public.meeting_integrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
