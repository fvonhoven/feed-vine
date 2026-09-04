-- Server-side plan limit enforcement (mirrors src/lib/stripe.ts PRICING_PLANS limits).
-- Prevents bypassing client-side checks via direct Supabase API calls.

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
        AND s.status IN ('active', 'trialing', 'past_due')
      LIMIT 1
    ),
    'free'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_plan_limit(p_plan_id TEXT, p_limit TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Unlimited (-1) for premium and team tiers
  IF p_plan_id IN ('premium', 'team', 'team_pro', 'team_business') THEN
    RETURN -1;
  END IF;

  CASE p_limit
    WHEN 'maxFeeds' THEN
      CASE p_plan_id
        WHEN 'free' THEN RETURN 5;
        WHEN 'pro' THEN RETURN 25;
        WHEN 'plus' THEN RETURN 100;
        ELSE RETURN 5;
      END CASE;
    WHEN 'maxCategories' THEN
      CASE p_plan_id
        WHEN 'free' THEN RETURN 2;
        WHEN 'pro' THEN RETURN 10;
        WHEN 'plus' THEN RETURN 25;
        ELSE RETURN 2;
      END CASE;
    WHEN 'maxCollections' THEN
      CASE p_plan_id
        WHEN 'free' THEN RETURN 0;
        WHEN 'pro' THEN RETURN 1;
        WHEN 'plus' THEN RETURN 5;
        ELSE RETURN 0;
      END CASE;
    WHEN 'maxWebhooks' THEN
      CASE p_plan_id
        WHEN 'free' THEN RETURN 0;
        WHEN 'pro' THEN RETURN 0;
        WHEN 'plus' THEN RETURN 5;
        ELSE RETURN 0;
      END CASE;
    ELSE
      RETURN 0;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_plan_limit(
  p_user_id UUID,
  p_limit TEXT,
  p_current_count BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_max INTEGER;
  v_label TEXT;
BEGIN
  v_plan_id := public.get_user_plan_id(p_user_id);
  v_max := public.get_plan_limit(v_plan_id, p_limit);

  IF v_max = -1 THEN
    RETURN;
  END IF;

  IF p_current_count >= v_max THEN
    v_label := CASE p_limit
      WHEN 'maxFeeds' THEN 'feed'
      WHEN 'maxCategories' THEN 'category'
      WHEN 'maxCollections' THEN 'collection'
      WHEN 'maxWebhooks' THEN 'webhook'
      ELSE 'resource'
    END;

    RAISE EXCEPTION 'Plan limit reached: maximum % % allowed on your plan. Upgrade at https://feedvine.app/pricing',
      v_max, v_label
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_feed_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.feeds
  WHERE user_id = NEW.user_id;

  PERFORM public.enforce_plan_limit(NEW.user_id, 'maxFeeds', v_count);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_category_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.categories
  WHERE user_id = NEW.user_id;

  PERFORM public.enforce_plan_limit(NEW.user_id, 'maxCategories', v_count);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_collection_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- Team collections use team plan limits (unlimited on team tiers); only personal collections count.
  IF NEW.team_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.feed_collections
  WHERE user_id = NEW.user_id
    AND team_id IS NULL;

  PERFORM public.enforce_plan_limit(NEW.user_id, 'maxCollections', v_count);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_webhook_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.webhooks
  WHERE user_id = NEW.user_id;

  PERFORM public.enforce_plan_limit(NEW.user_id, 'maxWebhooks', v_count);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_feed_plan_limit ON public.feeds;
CREATE TRIGGER enforce_feed_plan_limit
  BEFORE INSERT ON public.feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.check_feed_plan_limit();

DROP TRIGGER IF EXISTS enforce_category_plan_limit ON public.categories;
CREATE TRIGGER enforce_category_plan_limit
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.check_category_plan_limit();

DROP TRIGGER IF EXISTS enforce_collection_plan_limit ON public.feed_collections;
CREATE TRIGGER enforce_collection_plan_limit
  BEFORE INSERT ON public.feed_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.check_collection_plan_limit();

DROP TRIGGER IF EXISTS enforce_webhook_plan_limit ON public.webhooks;
CREATE TRIGGER enforce_webhook_plan_limit
  BEFORE INSERT ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_webhook_plan_limit();

GRANT EXECUTE ON FUNCTION public.get_user_plan_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_limit(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_plan_limit(UUID, TEXT, BIGINT) TO authenticated;
