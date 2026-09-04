-- FeedVine Studio: brand profiles, source permissions, generated drafts, and usage.

CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  newsletter_name TEXT NOT NULL,
  instagram_handle TEXT,
  tagline TEXT,
  audience TEXT NOT NULL DEFAULT '',
  voice TEXT NOT NULL DEFAULT '',
  content_focus TEXT NOT NULL DEFAULT '',
  home_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#7c3aed',
  accent_color TEXT NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brand_profiles_user_brand_unique UNIQUE (user_id, brand_name)
);

CREATE TABLE IF NOT EXISTS public.source_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_id UUID NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
  use_mode TEXT NOT NULL DEFAULT 'link_only'
    CHECK (use_mode IN ('licensed', 'open', 'link_only', 'blocked')),
  license_name TEXT,
  license_url TEXT,
  attribution_text TEXT,
  commercial_use_allowed BOOLEAN NOT NULL DEFAULT false,
  adaptation_allowed BOOLEAN NOT NULL DEFAULT false,
  images_allowed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT source_policies_user_feed_unique UNIQUE (user_id, feed_id)
);

CREATE TABLE IF NOT EXISTS public.studio_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_profile_id UUID NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'exported')),
  newsletter_intro TEXT NOT NULL DEFAULT '',
  instagram_caption TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_campaign_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.studio_campaigns(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  source_mode TEXT NOT NULL CHECK (source_mode IN ('licensed', 'open', 'link_only')),
  source_title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  attribution TEXT NOT NULL,
  headline TEXT NOT NULL,
  commentary TEXT NOT NULL,
  guardrail_status TEXT NOT NULL DEFAULT 'passed'
    CHECK (guardrail_status IN ('passed', 'replaced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT studio_campaign_items_campaign_position_unique UNIQUE (campaign_id, position)
);

CREATE TABLE IF NOT EXISTS public.studio_generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT studio_generation_usage_user_month_unique UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS brand_profiles_user_idx ON public.brand_profiles(user_id);
CREATE INDEX IF NOT EXISTS source_policies_user_idx ON public.source_policies(user_id);
CREATE INDEX IF NOT EXISTS source_policies_feed_idx ON public.source_policies(feed_id);
CREATE INDEX IF NOT EXISTS studio_campaigns_user_created_idx ON public.studio_campaigns(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS studio_campaign_items_campaign_idx ON public.studio_campaign_items(campaign_id, position);

CREATE OR REPLACE FUNCTION public.set_studio_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brand_profiles_set_updated_at ON public.brand_profiles;
CREATE TRIGGER brand_profiles_set_updated_at
  BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_studio_updated_at();

DROP TRIGGER IF EXISTS source_policies_set_updated_at ON public.source_policies;
CREATE TRIGGER source_policies_set_updated_at
  BEFORE UPDATE ON public.source_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_studio_updated_at();

DROP TRIGGER IF EXISTS studio_campaigns_set_updated_at ON public.studio_campaigns;
CREATE TRIGGER studio_campaigns_set_updated_at
  BEFORE UPDATE ON public.studio_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_studio_updated_at();

DROP TRIGGER IF EXISTS studio_generation_usage_set_updated_at ON public.studio_generation_usage;
CREATE TRIGGER studio_generation_usage_set_updated_at
  BEFORE UPDATE ON public.studio_generation_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_studio_updated_at();

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brand profiles"
  ON public.brand_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their own source policies"
  ON public.source_policies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create policies for their feeds"
  ON public.source_policies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.feeds
      WHERE feeds.id = source_policies.feed_id
        AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update policies for their feeds"
  ON public.source_policies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.feeds
      WHERE feeds.id = source_policies.feed_id
        AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete their own source policies"
  ON public.source_policies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own studio campaigns"
  ON public.studio_campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.brand_profiles
      WHERE brand_profiles.id = studio_campaigns.brand_profile_id
        AND brand_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users view items in their studio campaigns"
  ON public.studio_campaign_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_campaigns
      WHERE studio_campaigns.id = studio_campaign_items.campaign_id
        AND studio_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users create items in their studio campaigns"
  ON public.studio_campaign_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studio_campaigns
      WHERE studio_campaigns.id = studio_campaign_items.campaign_id
        AND studio_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update items in their studio campaigns"
  ON public.studio_campaign_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_campaigns
      WHERE studio_campaigns.id = studio_campaign_items.campaign_id
        AND studio_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete items in their studio campaigns"
  ON public.studio_campaign_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_campaigns
      WHERE studio_campaigns.id = studio_campaign_items.campaign_id
        AND studio_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users view their own studio usage"
  ON public.studio_generation_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Atomically claims one monthly generation so parallel requests cannot exceed a paid plan cap.
-- This is service-role only; the Edge Function authenticates the caller and supplies their user id.
CREATE OR REPLACE FUNCTION public.claim_studio_generation(
  p_user_id UUID,
  p_month DATE,
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
  INSERT INTO public.studio_generation_usage (user_id, month, count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month) DO UPDATE
    SET count = public.studio_generation_usage.count + 1,
        updated_at = now()
    WHERE p_limit < 0 OR public.studio_generation_usage.count < p_limit
  RETURNING count INTO next_count;

  IF next_count IS NULL THEN
    RAISE EXCEPTION 'STUDIO_LIMIT_REACHED';
  END IF;

  RETURN next_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_studio_generation(UUID, DATE, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_studio_generation(UUID, DATE, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_studio_generation(UUID, DATE, INTEGER) TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_campaign_items TO authenticated;
GRANT SELECT ON public.studio_generation_usage TO authenticated;
GRANT ALL ON public.brand_profiles, public.source_policies, public.studio_campaigns,
  public.studio_campaign_items, public.studio_generation_usage TO service_role;
