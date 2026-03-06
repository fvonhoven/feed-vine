-- Slack Bot Integration
-- Stores workspace installations and per-channel feed subscriptions

CREATE TABLE IF NOT EXISTS slack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  slack_workspace_id TEXT NOT NULL UNIQUE,
  slack_workspace_name TEXT,
  slack_bot_token TEXT NOT NULL,
  installed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_slack_installations_team_id ON slack_installations(team_id);

CREATE TABLE IF NOT EXISTS slack_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES slack_installations(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES feed_collections(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slack_sub_feed_unique UNIQUE (installation_id, channel_id, feed_id),
  CONSTRAINT slack_sub_collection_unique UNIQUE (installation_id, channel_id, collection_id),
  CONSTRAINT slack_sub_requires_target CHECK (feed_id IS NOT NULL OR collection_id IS NOT NULL)
);

CREATE INDEX idx_slack_subscriptions_installation ON slack_subscriptions(installation_id);
CREATE INDEX idx_slack_subscriptions_feed ON slack_subscriptions(feed_id);
CREATE INDEX idx_slack_subscriptions_collection ON slack_subscriptions(collection_id);

ALTER TABLE slack_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_subscriptions ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's Slack installation
CREATE POLICY "Team members can view slack installations"
  ON slack_installations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = slack_installations.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Only team admins/owners can manage installations
CREATE POLICY "Team admins can manage slack installations"
  ON slack_installations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = slack_installations.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

-- Anyone on the team can view subscriptions
CREATE POLICY "Team members can view slack subscriptions"
  ON slack_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM slack_installations si
      JOIN team_members tm ON tm.team_id = si.team_id
      WHERE si.id = slack_subscriptions.installation_id
        AND tm.user_id = auth.uid()
    )
  );

-- Service role handles all writes from edge functions
