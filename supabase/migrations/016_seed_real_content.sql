-- Seed real content for QA/Demo purposes

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_verge_id UUID;
  v_wired_id UUID;
  v_collection_id UUID;
BEGIN
  -- 1. Insert Real Feeds
  INSERT INTO public.feeds (user_id, title, url, description, category_id)
  VALUES 
  (v_user_id, 'The Verge', 'https://www.theverge.com/rss/index.xml', 'Technology news, science, art, and culture.', NULL),
  (v_user_id, 'Wired', 'https://www.wired.com/feed/rss', 'The latest news from WIRED.', NULL)
  ON CONFLICT (user_id, url) DO UPDATE SET title = EXCLUDED.title;

  -- Get Feed IDs
  SELECT id INTO v_wired_id FROM public.feeds WHERE user_id = v_user_id AND url = 'https://www.wired.com/feed/rss';
  SELECT id INTO v_verge_id FROM public.feeds WHERE user_id = v_user_id AND url = 'https://www.theverge.com/rss/index.xml';

  -- 2. Create "Real Tech News" Collection
  INSERT INTO public.feed_collections (user_id, name, slug, description, is_public, marketplace_listed, tags, subscribers_count, output_format)
  VALUES (
    v_user_id,
    'Real Tech News',
    'real-tech-news',
    'A real, working collection of tech feeds for QA testing. Contains The Verge and Wired.',
    true,
    true,
    ARRAY['qa', 'tech', 'real-data'],
    5,
    'rss'
  )
  ON CONFLICT (user_id, slug) DO UPDATE SET
    description = EXCLUDED.description,
    marketplace_listed = true
  RETURNING id INTO v_collection_id;

  -- 3. Link Feeds to Collection
  IF v_collection_id IS NOT NULL AND v_verge_id IS NOT NULL THEN
    INSERT INTO public.feed_collection_sources (collection_id, feed_id)
    VALUES (v_collection_id, v_verge_id)
    ON CONFLICT (collection_id, feed_id) DO NOTHING;
  END IF;

  IF v_collection_id IS NOT NULL AND v_wired_id IS NOT NULL THEN
    INSERT INTO public.feed_collection_sources (collection_id, feed_id)
    VALUES (v_collection_id, v_wired_id)
    ON CONFLICT (collection_id, feed_id) DO NOTHING;
  END IF;

END $$;
