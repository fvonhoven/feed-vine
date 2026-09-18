-- Rate-limit telemetry is service-role only.
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ip_rate_limits_no_public_access" ON public.ip_rate_limits;
CREATE POLICY "ip_rate_limits_no_public_access"
  ON public.ip_rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.ip_rate_limits FROM PUBLIC;
REVOKE ALL ON public.ip_rate_limits FROM anon;
REVOKE ALL ON public.ip_rate_limits FROM authenticated;

COMMENT ON TABLE public.ip_rate_limits IS
  'Service-role-only telemetry used to enforce IP request limits.';
