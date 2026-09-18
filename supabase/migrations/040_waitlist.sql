-- Waitlist storage is written only by the join-waitlist Edge Function.
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON public.waitlist(notified);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_no_public_access" ON public.waitlist;
CREATE POLICY "waitlist_no_public_access"
  ON public.waitlist
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.waitlist FROM PUBLIC;
REVOKE ALL ON public.waitlist FROM anon;
REVOKE ALL ON public.waitlist FROM authenticated;
GRANT ALL ON public.waitlist TO service_role;

COMMENT ON TABLE public.waitlist IS
  'Service-role-only email waitlist storage.';
