-- Migration: Waitlist
-- Description: Create waitlist table for capturing email signups while signup is disabled

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notified BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Create index for notified status
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON waitlist(notified);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy that blocks all public access
-- Only service role (Edge Functions) can access this table
CREATE POLICY "waitlist_no_public_access" ON waitlist
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add comment
COMMENT ON TABLE waitlist IS 'Email waitlist for users interested in FeedVine. RLS enabled to block public access. Only accessible via Edge Functions with service role key.';

