-- Optional QA/demo seed. Do not apply to production as a migration.
DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_verge_id UUID;
  v_wired_id UUID;
  v_collection_id UUID;
BEGIN
  INSERT INTO public.feeds (user_id, title, url, description, category_id)
  VALUES
    (v_user_id, 'The Verge', 'https://www.theverge.com/rss/index.xml', 'Technology news, science, art, and culture.', NULL),
    (v_user_id, 'Wired', 'https://www.wired.com/feed/rss', 'The latest news from WIRED.', NULL)
  ON CONFLICT (user_id, url) DO UPDATE SET title = EXCLUDED.title;

  SELECT id INTO v_wired_id FROM public.feeds WHERE user_id = v_user_id AND url = 'https://www.wired.com/feed/rss';
  SELECT id INTO v_verge_id FROM public.feeds WHERE user_id = v_user_id AND url = 'https://www.theverge.com/rss/index.xml';

  INSERT INTO public.feed_collections (user_id, name, slug, description, is_public, marketplace_listed, tags, subscribers_count, output_format)
  VALUES (v_user_id, 'Real Tech News', 'real-tech-news', 'QA collection with live technology feeds.', true, true, ARRAY['qa', 'tech', 'real-data'], 5, 'rss')
  ON CONFLICT (user_id, slug) DO UPDATE SET description = EXCLUDED.description, marketplace_listed = true
  RETURNING id INTO v_collection_id;

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
