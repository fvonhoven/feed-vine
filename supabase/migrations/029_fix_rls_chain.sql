-- Fix: RLS policies on feed_collections / feed_collection_sources that subquery
-- team_members cause a multi-level RLS chain (feed_collections → team_members → self).
-- PostgreSQL chokes on this.  Replace the inline subqueries with SECURITY DEFINER
-- helper functions that bypass RLS on team_members.

-- Helper: check if the current user is a member of a given team
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

-- Helper: check if the current user is an admin/owner of a given team
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- Drop the broken policies from migration 025
DROP POLICY IF EXISTS "Team members can view team collections" ON feed_collections;
DROP POLICY IF EXISTS "Team admins can create team collections" ON feed_collections;
DROP POLICY IF EXISTS "Team admins can update team collections" ON feed_collections;
DROP POLICY IF EXISTS "Team admins can delete team collections" ON feed_collections;
DROP POLICY IF EXISTS "Team members can view team collection sources" ON feed_collection_sources;
DROP POLICY IF EXISTS "Team admins can manage team collection sources" ON feed_collection_sources;
DROP POLICY IF EXISTS "Team admins can delete team collection sources" ON feed_collection_sources;

-- Recreate using the SECURITY DEFINER helpers

CREATE POLICY "Team members can view team collections"
  ON feed_collections FOR SELECT
  USING (
    team_id IS NOT NULL AND is_team_member(team_id)
  );

CREATE POLICY "Team admins can create team collections"
  ON feed_collections FOR INSERT
  WITH CHECK (
    team_id IS NULL OR is_team_admin(team_id)
  );

CREATE POLICY "Team admins can update team collections"
  ON feed_collections FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND is_team_admin(team_id))
  );

CREATE POLICY "Team admins can delete team collections"
  ON feed_collections FOR DELETE
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND is_team_admin(team_id))
  );

CREATE POLICY "Team members can view team collection sources"
  ON feed_collection_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections fc
      WHERE fc.id = feed_collection_sources.collection_id
        AND fc.team_id IS NOT NULL
        AND is_team_member(fc.team_id)
    )
  );

CREATE POLICY "Team admins can manage team collection sources"
  ON feed_collection_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feed_collections fc
      WHERE fc.id = feed_collection_sources.collection_id
        AND fc.team_id IS NOT NULL
        AND is_team_admin(fc.team_id)
    )
  );

CREATE POLICY "Team admins can delete team collection sources"
  ON feed_collection_sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections fc
      WHERE fc.id = feed_collection_sources.collection_id
        AND fc.team_id IS NOT NULL
        AND is_team_admin(fc.team_id)
    )
  );
