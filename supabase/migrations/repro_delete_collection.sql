
-- 1. Create a test user (owner)
INSERT INTO auth.users (id, email) VALUES ('uuid-owner', 'owner@example.com') ON CONFLICT DO NOTHING;

-- 2. Create another test user (subscriber)
INSERT INTO auth.users (id, email) VALUES ('uuid-subscriber', 'subscriber@example.com') ON CONFLICT DO NOTHING;

-- 3. Create a collection
INSERT INTO feed_collections (id, user_id, name, slug, marketplace_listed)
VALUES ('uuid-collection', 'uuid-owner', 'Test Collection', 'test-collection', true);

-- 4. Create a subscription
INSERT INTO marketplace_subscriptions (subscriber_id, collection_id)
VALUES ('uuid-subscriber', 'uuid-collection');

-- 5. Try to delete the collection (simulate owner deleting it)
-- We need to act as the owner? No, we are testing schema constraints here.
DELETE FROM feed_collections WHERE id = 'uuid-collection';

-- 6. Check if it's gone
SELECT count(*) FROM feed_collections WHERE id = 'uuid-collection';
SELECT count(*) FROM marketplace_subscriptions WHERE collection_id = 'uuid-collection';
