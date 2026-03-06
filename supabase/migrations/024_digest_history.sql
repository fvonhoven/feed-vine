-- Digest History: persist every digest that is sent or exported
CREATE TABLE IF NOT EXISTS digest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT,
  content_markdown TEXT,
  article_count INTEGER NOT NULL DEFAULT 0,
  article_ids JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'all_feeds',        -- 'all_feeds' | 'collection'
  collection_id UUID REFERENCES feed_collections(id) ON DELETE SET NULL,
  destination TEXT NOT NULL DEFAULT 'clipboard',    -- 'clipboard' | 'beehiiv' | 'mailerlite'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digest_history_user_id ON digest_history(user_id);
CREATE INDEX idx_digest_history_created_at ON digest_history(created_at DESC);

ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digest history"
  ON digest_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digest history"
  ON digest_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own digest history"
  ON digest_history FOR DELETE
  USING (auth.uid() = user_id);
