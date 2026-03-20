-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule RSS fetching to run every hour
-- IMPORTANT: Set CRON_SECRET in Supabase Edge Function secrets, then replace YOUR_CRON_SECRET below
-- Or use the service_role key as Bearer token for Authorization header
SELECT cron.schedule(
  'fetch-rss-hourly',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url:='https://jrjotduzvzbslnbhswxo.supabase.co/functions/v1/fetch-rss',
    headers:='{"Content-Type": "application/json", "X-Cron-Secret": "YOUR_CRON_SECRET"}'::jsonb
  ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

