-- Migration: Enable RLS on ip_rate_limits table
-- Description: Fix security issue - enable Row Level Security on ip_rate_limits table
-- This table should only be accessible by Edge Functions using service role key

-- Enable RLS on ip_rate_limits table
ALTER TABLE ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "ip_rate_limits_no_public_access" ON ip_rate_limits;

-- Create policy that blocks all public access
-- Only service role (Edge Functions) can access this table
CREATE POLICY "ip_rate_limits_no_public_access" ON ip_rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add comment explaining the security model
COMMENT ON TABLE ip_rate_limits IS 'IP-based rate limiting table. RLS enabled to block public access. Only accessible via Edge Functions with service role key.';

