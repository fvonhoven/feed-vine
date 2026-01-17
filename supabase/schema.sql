-- Create categories table (Feedly-like collections)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Create feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  last_fetched TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, url)
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  author TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  guid TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(feed_id, guid)
);

-- Create user_articles table (for read/saved status)
CREATE TABLE IF NOT EXISTS user_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  is_saved BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  saved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, article_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_feeds_category_id ON feeds(category_id);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
CREATE INDEX IF NOT EXISTS idx_user_articles_user_id ON user_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_article_id ON user_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_is_read ON user_articles(is_read);
CREATE INDEX IF NOT EXISTS idx_user_articles_is_saved ON user_articles(is_saved);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories table
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for feeds table
CREATE POLICY "Users can view own feeds"
  ON feeds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feeds"
  ON feeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feeds"
  ON feeds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feeds"
  ON feeds FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for articles table
CREATE POLICY "Users can view articles from their feeds"
  ON articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

-- RLS Policies for user_articles table
CREATE POLICY "Users can view own article states"
  ON user_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own article states"
  ON user_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own article states"
  ON user_articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own article states"
  ON user_articles FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON categories TO authenticated;
GRANT ALL ON feeds TO authenticated;
GRANT ALL ON articles TO authenticated;
GRANT ALL ON user_articles TO authenticated;
GRANT SELECT ON categories TO anon;
GRANT SELECT ON feeds TO anon;
GRANT SELECT ON articles TO anon;

