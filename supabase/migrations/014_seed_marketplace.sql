-- Seed data for Marketplace
-- Create a "Curator Bot" user if it doesn't exist
DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Fixed UUID for idempotency
BEGIN
  -- Insert user into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'bot@feedvine.app',
      '$2a$10$w1.qC1', -- dummy hash
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"FeedVine Curator"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Insert Collections
  INSERT INTO public.feed_collections (user_id, name, slug, description, is_public, marketplace_listed, tags, subscribers_count, output_format)
  VALUES
  (
    v_user_id,
    'Top Tech News',
    'top-tech-news',
    'Daily digest of the most important technology news from Verge, TechCrunch, and Wired.',
    true,
    true,
    ARRAY['tech', 'startups', 'gadgets'],
    124,
    'rss'
  ),
  (
    v_user_id,
    'AI Research Daily',
    'ai-research-daily',
    'Keeping up with the latest papers and breakthroughs in Artificial Intelligence.',
    true,
    true,
    ARRAY['ai', 'research', 'ml', 'future'],
    856,
    'both'
  ),
  (
    v_user_id,
    'Indie Hacker Kit',
    'indie-hacker-kit',
    'Resources, stories, and growth tactics for solo founders.',
    true,
    true,
    ARRAY['business', 'indiehackers', 'saas'],
    42,
    'json'
  ),
  (
    v_user_id,
    'Design Inspiration',
    'design-inspiration',
    'Daily dose of UI/UX goodness.',
    true,
    true,
    ARRAY['design', 'ui', 'ux', 'art'],
    305,
    'rss'
  )
  ON CONFLICT (user_id, slug) DO UPDATE SET
    marketplace_listed = EXCLUDED.marketplace_listed,
    tags = EXCLUDED.tags,
    subscribers_count = EXCLUDED.subscribers_count;

END $$;
