-- Supabase linter: auth_users_exposed — public views must not SELECT from auth.users
-- (emails / metadata were exposed to anon via marketplace_collections_view).
-- App reads marketplace data from feed_collections + RLS, not this view.
-- DROP required: Postgres does not allow removing columns via CREATE OR REPLACE VIEW.

DROP VIEW IF EXISTS marketplace_collections_view;

CREATE VIEW marketplace_collections_view AS
SELECT
  fc.*,
  COALESCE(source_counts.feed_count, 0) AS feed_count
FROM feed_collections fc
LEFT JOIN (
  SELECT collection_id, COUNT(*) AS feed_count
  FROM feed_collection_sources
  GROUP BY collection_id
) source_counts ON fc.id = source_counts.collection_id
WHERE fc.marketplace_listed = true;

REVOKE ALL ON marketplace_collections_view FROM PUBLIC;
GRANT SELECT ON marketplace_collections_view TO authenticated;
