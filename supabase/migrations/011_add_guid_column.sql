-- Migration: Add guid column to articles table
-- The guid column is needed for proper RSS article deduplication
-- RSS feeds use GUID (Globally Unique Identifier) to identify articles

-- Add the guid column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'guid'
  ) THEN
    ALTER TABLE articles ADD COLUMN guid TEXT;
  END IF;
END $$;

-- Populate guid with url for existing articles (as a fallback)
UPDATE articles SET guid = url WHERE guid IS NULL;

-- Make guid NOT NULL after populating
ALTER TABLE articles ALTER COLUMN guid SET NOT NULL;

-- Drop the old (feed_id, url) unique constraint if it exists
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_feed_id_url_key;

-- Add the new (feed_id, guid) unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'articles_feed_id_guid_key'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_feed_id_guid_key UNIQUE (feed_id, guid);
  END IF;
END $$;

-- Add index on guid for faster lookups
CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles(guid);

-- Add comment for documentation
COMMENT ON COLUMN articles.guid IS 'RSS GUID (Globally Unique Identifier) for the article';

