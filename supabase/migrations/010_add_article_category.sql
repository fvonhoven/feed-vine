-- Migration: Add category field to articles table for automatic categorization
-- Categories: AI News, Tools, Opinion, Startups, Backend, Tutorial, Research, Uncategorized

-- Add category column
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized';

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- Add comment for documentation
COMMENT ON COLUMN articles.category IS 'Auto-categorized topic: AI News, Tools, Opinion, Startups, Backend, Tutorial, Research, or Uncategorized';

