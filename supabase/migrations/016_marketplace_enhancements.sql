-- Add is_featured column for staff picks
ALTER TABLE feed_collections 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create index for featured collections
CREATE INDEX IF NOT EXISTS idx_feed_collections_is_featured ON feed_collections(is_featured);

-- Create a view for marketplace collections with feed count
-- This makes it easier to query collections with their feed counts
CREATE OR REPLACE VIEW marketplace_collections_view AS
SELECT 
  fc.*,
  COALESCE(source_counts.feed_count, 0) as feed_count,
  u.raw_user_meta_data->>'name' as creator_name,
  u.email as creator_email
FROM feed_collections fc
LEFT JOIN (
  SELECT collection_id, COUNT(*) as feed_count
  FROM feed_collection_sources
  GROUP BY collection_id
) source_counts ON fc.id = source_counts.collection_id
LEFT JOIN auth.users u ON fc.user_id = u.id
WHERE fc.marketplace_listed = true;

-- Grant access to the view
GRANT SELECT ON marketplace_collections_view TO authenticated;
GRANT SELECT ON marketplace_collections_view TO anon;

-- Mark some collections as featured (seed data)
UPDATE feed_collections 
SET is_featured = true 
WHERE name IN ('Top Tech News', 'AI Research Daily')
AND marketplace_listed = true;

