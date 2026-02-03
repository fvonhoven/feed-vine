-- Add marketplace fields to feed_collections
ALTER TABLE feed_collections 
ADD COLUMN IF NOT EXISTS marketplace_listed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;

-- Create index for marketplace searches
CREATE INDEX IF NOT EXISTS idx_feed_collections_marketplace_listed ON feed_collections(marketplace_listed);
CREATE INDEX IF NOT EXISTS idx_feed_collections_tags ON feed_collections USING GIN(tags);

-- Create marketplace_subscriptions table
CREATE TABLE IF NOT EXISTS marketplace_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES feed_collections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, collection_id)
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_subscriber ON marketplace_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_subscriptions_collection ON marketplace_subscriptions(collection_id);

-- RLS Policies for marketplace_subscriptions
ALTER TABLE marketplace_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON marketplace_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id);

-- Creator can view who subscribed (optional, maybe just count is enough, but listing is good for analytics)
CREATE POLICY "Creators can view their collection subscribers"
  ON marketplace_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = marketplace_subscriptions.collection_id
      AND feed_collections.user_id = auth.uid()
    )
  );

-- Users can subscribe (insert)
CREATE POLICY "Users can subscribe to collections"
  ON marketplace_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

-- Users can unsubscribe (delete)
CREATE POLICY "Users can unsubscribe"
  ON marketplace_subscriptions FOR DELETE
  USING (auth.uid() = subscriber_id);

-- Trigger to update subscriber count
CREATE OR REPLACE FUNCTION update_collection_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE feed_collections
    SET subscribers_count = subscribers_count + 1
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE feed_collections
    SET subscribers_count = subscribers_count - 1
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_marketplace_subscription_change
AFTER INSERT OR DELETE ON marketplace_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_collection_subscriber_count();

-- Grant permissions to anonymous for public marketplace viewing logic if needed
-- (Though subscriptions require auth)
GRANT ALL ON marketplace_subscriptions TO authenticated;
