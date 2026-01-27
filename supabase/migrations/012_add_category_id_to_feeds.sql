-- Add category_id column to feeds table
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feeds_category_id ON feeds(category_id);

