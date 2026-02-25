-- Scheduled digests: auto-create newsletter drafts on a schedule
-- Triggered by pg_cron calling send-scheduled-digest edge function

CREATE TABLE scheduled_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly_monday', 'weekly_wednesday', 'weekly_friday')),
  collection_id UUID REFERENCES feed_collections(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('beehiiv', 'mailerlite')),
  max_articles INT NOT NULL DEFAULT 10,
  digest_title_template TEXT NOT NULL DEFAULT '{name} – {date}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only manage their own schedules
ALTER TABLE scheduled_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own scheduled_digests"
  ON scheduled_digests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_scheduled_digests_user_id ON scheduled_digests (user_id);
CREATE INDEX idx_scheduled_digests_next_run ON scheduled_digests (next_run_at) WHERE is_active = true;

-- Schedule pg_cron job to run every hour and dispatch due digests
-- NOTE: pg_cron must be enabled in your Supabase project (Database → Extensions → pg_cron)
-- Run this manually after enabling pg_cron:
--
-- SELECT cron.schedule(
--   'send-scheduled-digests',
--   '0 * * * *',
--   $$
--     SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/send-scheduled-digest',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );

