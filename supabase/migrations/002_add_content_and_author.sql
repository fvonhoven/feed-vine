-- Migration: Add description, content, and author fields to articles table
-- RSS feeds have two text fields:
--   - description: Short summary/excerpt (always present)
--   - content: Full article body (optional, from content:encoded)

-- Add new columns if they don't exist
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS author TEXT;

-- Add comments for documentation
COMMENT ON COLUMN articles.description IS 'Short summary/excerpt from RSS <description> tag';
COMMENT ON COLUMN articles.content IS 'Full article body from RSS <content:encoded> or <content> tag (optional)';
COMMENT ON COLUMN articles.author IS 'Article author from RSS feed';

