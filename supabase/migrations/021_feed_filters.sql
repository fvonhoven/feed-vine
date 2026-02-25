-- Create feed_filters table for keyword-based article filtering
-- filter_type: 'include' = show only articles matching keywords; 'exclude' = hide articles matching keywords
-- feed_id NULL = global filter (applies to all feeds)
CREATE TABLE feed_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('include', 'exclude')),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE feed_filters ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own filters
CREATE POLICY "Users can manage their own feed filters"
  ON feed_filters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_feed_filters_user_id ON feed_filters(user_id);
CREATE INDEX idx_feed_filters_feed_id ON feed_filters(feed_id) WHERE feed_id IS NOT NULL;

