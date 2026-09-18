-- Destructive local-only reproduction for collection cascade behavior.
-- Replace these placeholders with valid local UUIDs before running manually.
BEGIN;

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000010', 'owner@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000011', 'subscriber@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.feed_collections (id, user_id, name, slug, marketplace_listed)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000010',
  'Test Collection',
  'test-collection',
  true
);

INSERT INTO public.marketplace_subscriptions (subscriber_id, collection_id)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012'
);

DELETE FROM public.feed_collections
WHERE id = '00000000-0000-0000-0000-000000000012';

SELECT count(*) FROM public.feed_collections
WHERE id = '00000000-0000-0000-0000-000000000012';

SELECT count(*) FROM public.marketplace_subscriptions
WHERE collection_id = '00000000-0000-0000-0000-000000000012';

ROLLBACK;
