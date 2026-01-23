-- Migration: IP-based Rate Limiting
-- Description: Add table for tracking IP-based rate limits to prevent abuse

-- Create ip_rate_limits table
CREATE TABLE IF NOT EXISTS ip_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_lookup 
  ON ip_rate_limits(ip_address, endpoint, created_at DESC);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_created_at 
  ON ip_rate_limits(created_at);

-- Add comment
COMMENT ON TABLE ip_rate_limits IS 'Tracks IP addresses for rate limiting to prevent abuse';

-- No RLS needed - this table is only accessed by Edge Functions with service role key
-- Users should never directly access this table

