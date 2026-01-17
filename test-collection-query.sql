-- Test query to verify your collection is set up correctly
-- Run this in Supabase SQL Editor

-- 1. Check if collection exists and is public
SELECT 
  id,
  name,
  slug,
  is_public,
  output_format,
  created_at
FROM feed_collections
WHERE slug = 'test-collection';

-- 2. Check feeds in the collection
SELECT 
  fc.name as collection_name,
  f.title as feed_title,
  f.url as feed_url
FROM feed_collections fc
JOIN feed_collection_sources fcs ON fc.id = fcs.collection_id
JOIN feeds f ON fcs.feed_id = f.id
WHERE fc.slug = 'test-collection';

-- 3. Check articles that should appear in the collection
SELECT 
  fc.name as collection_name,
  a.title as article_title,
  a.url as article_url,
  a.published_at,
  f.title as from_feed
FROM feed_collections fc
JOIN feed_collection_sources fcs ON fc.id = fcs.collection_id
JOIN feeds f ON fcs.feed_id = f.id
JOIN articles a ON a.feed_id = f.id
WHERE fc.slug = 'test-collection'
ORDER BY a.published_at DESC
LIMIT 20;

