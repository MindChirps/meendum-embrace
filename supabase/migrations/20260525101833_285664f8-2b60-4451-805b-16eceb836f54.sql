
DROP TABLE IF EXISTS public.recipient_credentials;

DROP POLICY IF EXISTS "recipient reads own tasks" ON public.tasks;
DROP POLICY IF EXISTS "recipient inserts own logs" ON public.activity_logs;
DROP POLICY IF EXISTS "recipient reads own logs" ON public.activity_logs;
DROP POLICY IF EXISTS "recipient reads own rest" ON public.rest_mode;
DROP POLICY IF EXISTS "recipient views their guardian" ON public.profiles;
