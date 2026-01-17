-- ============================================
-- RSS AGGREGATOR - COMPLETE DATABASE SETUP
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- This will create all necessary tables and policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feed_id, url)
);

-- Create user_articles table (for read/saved state per user)
CREATE TABLE IF NOT EXISTS user_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  saved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
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

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'pro', 'plus', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_articles_user_id ON user_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_article_id ON user_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_user_articles_is_read ON user_articles(is_read);
CREATE INDEX IF NOT EXISTS idx_user_articles_is_saved ON user_articles(is_saved);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_categories_feed_id ON feed_categories(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_categories_category_id ON feed_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - FEEDS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own feeds" ON feeds;
CREATE POLICY "Users can view their own feeds"
  ON feeds FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own feeds" ON feeds;
CREATE POLICY "Users can insert their own feeds"
  ON feeds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own feeds" ON feeds;
CREATE POLICY "Users can update their own feeds"
  ON feeds FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own feeds" ON feeds;
CREATE POLICY "Users can delete their own feeds"
  ON feeds FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - ARTICLES
-- ============================================

DROP POLICY IF EXISTS "Users can view articles from their feeds" ON articles;
CREATE POLICY "Users can view articles from their feeds"
  ON articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert articles to their feeds" ON articles;
CREATE POLICY "Users can insert articles to their feeds"
  ON articles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update articles from their feeds" ON articles;
CREATE POLICY "Users can update articles from their feeds"
  ON articles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete articles from their feeds" ON articles;
CREATE POLICY "Users can delete articles from their feeds"
  ON articles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = articles.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES - USER_ARTICLES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own article states" ON user_articles;
CREATE POLICY "Users can view their own article states"
  ON user_articles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own article states" ON user_articles;
CREATE POLICY "Users can insert their own article states"
  ON user_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own article states" ON user_articles;
CREATE POLICY "Users can update their own article states"
  ON user_articles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own article states" ON user_articles;
CREATE POLICY "Users can delete their own article states"
  ON user_articles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - CATEGORIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - FEED_CATEGORIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their feed categories" ON feed_categories;
CREATE POLICY "Users can view their feed categories"
  ON feed_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = feed_categories.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their feed categories" ON feed_categories;
CREATE POLICY "Users can insert their feed categories"
  ON feed_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = feed_categories.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their feed categories" ON feed_categories;
CREATE POLICY "Users can delete their feed categories"
  ON feed_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feeds
      WHERE feeds.id = feed_categories.feed_id
      AND feeds.user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES - SUBSCRIPTIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_feeds_updated_at ON feeds;
CREATE TRIGGER update_feeds_updated_at
  BEFORE UPDATE ON feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_articles_updated_at ON user_articles;
CREATE TRIGGER update_user_articles_updated_at
  BEFORE UPDATE ON user_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- Create default free subscription for existing users
INSERT INTO subscriptions (user_id, plan_id, status)
SELECT id, 'free', 'active'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

