-- Add full_text_enabled flag to feeds table
-- When true, fetch-rss will attempt to fetch the full article body
-- from the original URL and store it in articles.content

ALTER TABLE feeds ADD COLUMN IF NOT EXISTS full_text_enabled BOOLEAN NOT NULL DEFAULT false;

