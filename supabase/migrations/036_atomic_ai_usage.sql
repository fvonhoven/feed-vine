-- Atomically reserve an AI summary before calling the model so concurrent requests
-- cannot exceed a plan's fair-use ceiling. Service-role only.
CREATE OR REPLACE FUNCTION public.claim_ai_summary(
  p_user_id UUID,
  p_month TEXT,
  p_limit INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_count INTEGER;
BEGIN
  IF p_limit <= 0 THEN
    RAISE EXCEPTION 'AI_SUMMARY_LIMIT_REACHED';
  END IF;

  INSERT INTO public.ai_summary_usage (user_id, month, count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month) DO UPDATE
    SET count = public.ai_summary_usage.count + 1,
        updated_at = now()
    WHERE public.ai_summary_usage.count < p_limit
  RETURNING count INTO next_count;

  IF next_count IS NULL THEN
    RAISE EXCEPTION 'AI_SUMMARY_LIMIT_REACHED';
  END IF;

  RETURN next_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_summary(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_ai_summary(UUID, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_summary(UUID, TEXT, INTEGER) TO service_role;

-- Past-due and otherwise inactive subscriptions must not retain paid resource
-- creation rights while Stripe is attempting recovery.
CREATE OR REPLACE FUNCTION public.get_user_plan_id(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT s.plan_id
      FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND s.status IN ('active', 'trialing')
      LIMIT 1
    ),
    'free'
  );
$$;
