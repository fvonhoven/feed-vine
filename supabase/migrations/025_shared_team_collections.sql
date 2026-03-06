-- Shared Team Collections: add team_id to feed_collections
ALTER TABLE feed_collections ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX idx_feed_collections_team_id ON feed_collections(team_id);

-- Team members can view collections belonging to their team
CREATE POLICY "Team members can view team collections"
  ON feed_collections FOR SELECT
  USING (
    team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = feed_collections.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Team admins and owners can create team collections
CREATE POLICY "Team admins can create team collections"
  ON feed_collections FOR INSERT
  WITH CHECK (
    team_id IS NULL  -- personal collections always allowed
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = feed_collections.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

-- Team admins and owners can update team collections
CREATE POLICY "Team admins can update team collections"
  ON feed_collections FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = feed_collections.team_id
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('owner', 'admin')
      )
    )
  );

-- Team admins and owners can delete team collections
CREATE POLICY "Team admins can delete team collections"
  ON feed_collections FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = feed_collections.team_id
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('owner', 'admin')
      )
    )
  );

-- Team members can view feed sources of team collections
CREATE POLICY "Team members can view team collection sources"
  ON feed_collection_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections fc
      JOIN team_members tm ON tm.team_id = fc.team_id
      WHERE fc.id = feed_collection_sources.collection_id
        AND tm.user_id = auth.uid()
    )
  );

-- Team admins can manage feed sources of team collections
CREATE POLICY "Team admins can manage team collection sources"
  ON feed_collection_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feed_collections fc
      JOIN team_members tm ON tm.team_id = fc.team_id
      WHERE fc.id = feed_collection_sources.collection_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team admins can delete team collection sources"
  ON feed_collection_sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feed_collections fc
      JOIN team_members tm ON tm.team_id = fc.team_id
      WHERE fc.id = feed_collection_sources.collection_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );
