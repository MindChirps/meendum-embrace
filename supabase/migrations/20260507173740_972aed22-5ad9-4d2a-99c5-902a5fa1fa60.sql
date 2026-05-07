
ALTER FUNCTION public.tasks_validate() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.current_guardian_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_guardian() FROM PUBLIC, anon, authenticated;
