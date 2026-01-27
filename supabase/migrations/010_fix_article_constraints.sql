-- Migration: Fix article unique constraints
-- Remove the global URL unique constraint since articles from different feeds can have the same URL
-- Keep the (feed_id, guid) unique constraint which is more appropriate

-- Drop the global URL unique constraint if it exists
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_url_key;

-- Ensure we have the (feed_id, guid) unique constraint
-- This allows the same URL across different feeds but prevents duplicates within a feed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'articles_feed_id_guid_key'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_feed_id_guid_key UNIQUE (feed_id, guid);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT articles_feed_id_guid_key ON articles IS 'Ensures articles are unique per feed using GUID';

