-- Fix RLS policy to allow collection owners to delete subscriptions via CASCADE
-- When a collection is deleted, the cascade delete tries to remove marketplace_subscriptions
-- The previous policy only allowed subscribers to delete their own subscriptions
-- This prevented collection owners from deleting collections that had other subscribers

DROP POLICY IF EXISTS "Collection owners can delete subscriptions (cascade)" ON marketplace_subscriptions;

CREATE POLICY "Collection owners can delete subscriptions (cascade)"
  ON marketplace_subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections
      WHERE feed_collections.id = marketplace_subscriptions.collection_id
      AND feed_collections.user_id = auth.uid()
    )
  );
