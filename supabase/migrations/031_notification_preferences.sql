-- Notification Preferences: quiet hours + expanded digest schedule frequencies

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quiet_hours_start SMALLINT DEFAULT NULL CHECK (quiet_hours_start IS NULL OR (quiet_hours_start >= 0 AND quiet_hours_start <= 23)),
  quiet_hours_end   SMALLINT DEFAULT NULL CHECK (quiet_hours_end IS NULL OR (quiet_hours_end >= 0 AND quiet_hours_end <= 23)),
  quiet_hours_timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON user_preferences TO authenticated;

-- Expand scheduled_digests schedule CHECK to include higher frequencies
-- Drop old constraint and add new one
ALTER TABLE scheduled_digests DROP CONSTRAINT IF EXISTS scheduled_digests_schedule_check;
ALTER TABLE scheduled_digests ADD CONSTRAINT scheduled_digests_schedule_check
  CHECK (schedule IN ('hourly', 'every_6h', 'every_12h', 'daily', 'weekly_monday', 'weekly_wednesday', 'weekly_friday'));
