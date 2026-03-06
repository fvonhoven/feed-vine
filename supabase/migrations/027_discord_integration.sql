-- Discord Bot Integration
-- Stores guild installations and per-channel feed subscriptions

CREATE TABLE IF NOT EXISTS discord_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL UNIQUE,
  guild_name TEXT,
  discord_bot_token TEXT NOT NULL,
  installed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discord_installations_team_id ON discord_installations(team_id);

CREATE TABLE IF NOT EXISTS discord_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES discord_installations(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES feed_collections(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discord_sub_feed_unique UNIQUE (installation_id, channel_id, feed_id),
  CONSTRAINT discord_sub_collection_unique UNIQUE (installation_id, channel_id, collection_id),
  CONSTRAINT discord_sub_requires_target CHECK (feed_id IS NOT NULL OR collection_id IS NOT NULL)
);

CREATE INDEX idx_discord_subscriptions_installation ON discord_subscriptions(installation_id);
CREATE INDEX idx_discord_subscriptions_feed ON discord_subscriptions(feed_id);
CREATE INDEX idx_discord_subscriptions_collection ON discord_subscriptions(collection_id);

ALTER TABLE discord_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_subscriptions ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's Discord installation
CREATE POLICY "Team members can view discord installations"
  ON discord_installations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = discord_installations.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Only team admins/owners can manage installations
CREATE POLICY "Team admins can manage discord installations"
  ON discord_installations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = discord_installations.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

-- Anyone on the team can view subscriptions
CREATE POLICY "Team members can view discord subscriptions"
  ON discord_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM discord_installations di
      JOIN team_members tm ON tm.team_id = di.team_id
      WHERE di.id = discord_subscriptions.installation_id
        AND tm.user_id = auth.uid()
    )
  );

-- Service role handles all writes from edge functions
