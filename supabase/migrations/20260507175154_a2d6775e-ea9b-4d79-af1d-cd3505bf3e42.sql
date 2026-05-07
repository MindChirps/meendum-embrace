
CREATE OR REPLACE FUNCTION public.my_guardian_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT guardian_id FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.my_guardian_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_guardian_id() TO authenticated;

DROP POLICY IF EXISTS "recipient views their guardian" ON public.profiles;
CREATE POLICY "recipient views their guardian" ON public.profiles FOR SELECT TO authenticated
  USING (id = public.my_guardian_id());
