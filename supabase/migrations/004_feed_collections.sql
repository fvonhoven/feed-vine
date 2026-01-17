-- Create feed_collections table for custom aggregated feeds
CREATE TABLE IF NOT EXISTS feed_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  output_format TEXT NOT NULL DEFAULT 'rss' CHECK (output_format IN ('rss', 'json', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Create feed_collection_sources junction table
CREATE TABLE IF NOT EXISTS feed_collection_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES feed_collections(id) ON DELETE CASCADE,
  feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, feed_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feed_collections_user_id ON feed_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_collections_slug ON feed_collections(slug);
CREATE INDEX IF NOT EXISTS idx_feed_collections_is_public ON feed_collections(is_public);
CREATE INDEX IF NOT EXISTS idx_feed_collection_sources_collection_id ON feed_collection_sources(collection_id);
CREATE INDEX IF NOT EXISTS idx_feed_collection_sources_feed_id ON feed_collection_sources(feed_id);

-- Enable Row Level Security
ALTER TABLE feed_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_collection_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feed_collections
CREATE POLICY "Users can view own collections"
  ON feed_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public collections are viewable by anyone"
  ON feed_collections FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert own collections"
  ON feed_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON feed_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON feed_collections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for feed_collection_sources
CREATE POLICY "Users can view sources from their collections"
  ON feed_collection_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = feed_collection_sources.collection_id
      AND feed_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Public collection sources are viewable by anyone"
  ON feed_collection_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = feed_collection_sources.collection_id
      AND feed_collections.is_public = true
    )
  );

CREATE POLICY "Users can insert sources to their collections"
  ON feed_collection_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = feed_collection_sources.collection_id
      AND feed_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sources from their collections"
  ON feed_collection_sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = feed_collection_sources.collection_id
      AND feed_collections.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON feed_collections TO authenticated;
GRANT ALL ON feed_collection_sources TO authenticated;
GRANT SELECT ON feed_collections TO anon;
GRANT SELECT ON feed_collection_sources TO anon;

