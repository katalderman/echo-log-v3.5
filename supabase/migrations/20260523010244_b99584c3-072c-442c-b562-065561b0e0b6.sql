-- Profiles: restrict broad SELECT
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles readable by self, team manager, or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND team_id IS NOT NULL
    AND team_id = (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- Review metrics: scope manager access to their team
DROP POLICY IF EXISTS "Metrics visible to self, manager, or admin" ON public.review_metrics;

CREATE POLICY "Metrics visible to self, team manager, or admin"
ON public.review_metrics
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = review_metrics.user_id
        AND p.team_id IS NOT NULL
        AND p.team_id = (SELECT pm.team_id FROM public.profiles pm WHERE pm.id = auth.uid())
    )
  )
);