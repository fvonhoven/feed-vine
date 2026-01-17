-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_fetched TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, url)
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT,
  author TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feed_id, url)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create feed_categories junction table
CREATE TABLE IF NOT EXISTS feed_categories (
  feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (feed_id, category_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_saved ON articles(is_saved);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_categories_feed_id ON feed_categories(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_categories_category_id ON feed_categories(category_id);

-- Enable Row Level Security
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feeds
CREATE POLICY "Users can view their own feeds"
  ON feeds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feeds"
  ON feeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeds"
  ON feeds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeds"
  ON feeds FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for articles
CREATE POLICY "Users can view articles from their feeds"
  ON articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert articles to their feeds"
  ON articles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update articles from their feeds"
  ON articles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete articles from their feeds"
  ON articles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for feed_categories
CREATE POLICY "Users can view their feed categories"
  ON feed_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = feed_categories.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their feed categories"
  ON feed_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = feed_categories.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their feed categories"
  ON feed_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = feed_categories.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_feeds_updated_at
  BEFORE UPDATE ON feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

