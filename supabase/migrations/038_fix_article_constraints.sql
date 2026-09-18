-- Remove the global URL constraint while retaining feed-scoped GUID uniqueness.
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_url_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'articles_feed_id_guid_key'
      AND conrelid = 'public.articles'::regclass
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_feed_id_guid_key UNIQUE (feed_id, guid);
  END IF;
END $$;

COMMENT ON CONSTRAINT articles_feed_id_guid_key ON public.articles IS
  'Ensures articles are unique per feed using GUID';
