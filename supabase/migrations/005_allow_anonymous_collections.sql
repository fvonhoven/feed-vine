-- Allow anonymous users to read public collections and their sources
-- This is needed for the Edge Function to work without authentication

-- Grant anonymous role access to read public collections
GRANT SELECT ON feed_collections TO anon;
GRANT SELECT ON feed_collection_sources TO anon;
GRANT SELECT ON feeds TO anon;
GRANT SELECT ON articles TO anon;

-- Ensure the RLS policies allow anonymous access to public collections
-- (These should already exist from migration 004, but we're being explicit)

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Public collections are viewable by anyone" ON feed_collections;
DROP POLICY IF EXISTS "Public collection sources are viewable by anyone" ON feed_collection_sources;

CREATE POLICY "Public collections are viewable by anyone"
  ON feed_collections FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Public collection sources are viewable by anyone"
  ON feed_collection_sources FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = feed_collection_sources.collection_id
      AND feed_collections.is_public = true
    )
  );

-- Also ensure feeds and articles can be read anonymously for public collections
DROP POLICY IF EXISTS "Public feeds are viewable" ON feeds;
DROP POLICY IF EXISTS "Public articles are viewable" ON articles;

CREATE POLICY "Public feeds are viewable"
  ON feeds FOR SELECT
  TO anon, authenticated
  USING (true);  -- All feeds are readable (they're public RSS feeds anyway)

CREATE POLICY "Public articles are viewable"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (true);  -- All articles are readable (they're from public RSS feeds)

