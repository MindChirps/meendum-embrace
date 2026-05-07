
-- Enums
CREATE TYPE public.user_role AS ENUM ('guardian', 'recipient');
CREATE TYPE public.lang AS ENUM ('en', 'ta');
CREATE TYPE public.body_side AS ENUM ('left', 'right');
CREATE TYPE public.session_type AS ENUM ('morning', 'afternoon', 'evening');
CREATE TYPE public.log_status AS ENUM ('completed', 'skipped');
CREATE TYPE public.skip_reason AS ENUM ('pain', 'fatigue');

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  role public.user_role NOT NULL,
  custom_name TEXT NOT NULL DEFAULT '',
  preferred_language public.lang NOT NULL DEFAULT 'en',
  affected_side public.body_side,
  guardian_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pairing_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get guardian id for current user (could be guardian themselves or a recipient under guardian)
CREATE OR REPLACE FUNCTION public.current_guardian_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p.role = 'guardian' THEN p.id
    ELSE p.guardian_id
  END
  FROM public.profiles p WHERE p.id = auth.uid()
$$;

-- Profile policies
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "guardian views own recipients" ON public.profiles FOR SELECT TO authenticated
  USING (guardian_id = auth.uid());
CREATE POLICY "recipient views their guardian" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT guardian_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR guardian_id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR guardian_id = auth.uid());
CREATE POLICY "delete own recipient" ON public.profiles FOR DELETE TO authenticated
  USING (guardian_id = auth.uid());

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_type public.session_type NOT NULL,
  target_reps INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Length validation + max 4 active per session trigger
CREATE OR REPLACE FUNCTION public.tasks_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF length(NEW.name) > 20 OR length(NEW.name) < 1 THEN
    RAISE EXCEPTION 'Task name must be 1-20 chars';
  END IF;
  IF NEW.is_active THEN
    IF (SELECT COUNT(*) FROM public.tasks
        WHERE recipient_id = NEW.recipient_id
          AND session_type = NEW.session_type
          AND is_active = TRUE
          AND id <> NEW.id) >= 4 THEN
      RAISE EXCEPTION 'Maximum 4 active tasks per session';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tasks_validate_trg BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_validate();

CREATE POLICY "guardian manages tasks" ON public.tasks FOR ALL TO authenticated
  USING (guardian_id = auth.uid()) WITH CHECK (guardian_id = auth.uid());
CREATE POLICY "recipient reads own tasks" ON public.tasks FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.log_status NOT NULL,
  skip_reason public.skip_reason,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipient inserts own logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "recipient reads own logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "guardian reads recipient logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE guardian_id = auth.uid()));

-- Rest mode
CREATE TABLE public.rest_mode (
  recipient_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_resting BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rest_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guardian manages rest" ON public.rest_mode FOR ALL TO authenticated
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE guardian_id = auth.uid()))
  WITH CHECK (recipient_id IN (SELECT id FROM public.profiles WHERE guardian_id = auth.uid()));
CREATE POLICY "recipient reads own rest" ON public.rest_mode FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rest_mode;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER TABLE public.rest_mode REPLICA IDENTITY FULL;

-- Auto-create guardian profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_guardian()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, custom_name, preferred_language)
  VALUES (NEW.id, 'guardian', COALESCE(NEW.raw_user_meta_data->>'name',''), 'en')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_guardian();
