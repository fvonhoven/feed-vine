-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule RSS fetching to run every hour
SELECT cron.schedule(
  'fetch-rss-hourly',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url:='https://jrjotduzvzbslnbhswxo.supabase.co/functions/v1/fetch-rss',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyam90ZHV6dnpic2xuYmhzd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjY5NjIsImV4cCI6MjA4NDEwMjk2Mn0.mUzqn8ZOLX4BT_PVBfLDAD3NQx_PHytBDxHUML5kXOg"}'::jsonb
  ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

