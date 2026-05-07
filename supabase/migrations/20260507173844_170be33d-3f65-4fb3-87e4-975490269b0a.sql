
CREATE TABLE public.recipient_credentials (
  recipient_id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipient_credentials ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Service role bypasses RLS.
