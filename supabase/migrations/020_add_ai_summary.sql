-- Migration: Add AI summary columns to articles and create usage tracking table
-- Run after: 019_add_full_text_enabled.sql

-- Add AI summary columns to articles table
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ;

-- Create usage tracking table for AI summaries (per user, per month)
CREATE TABLE IF NOT EXISTS ai_summary_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- Format: 'YYYY-MM' e.g. '2026-02'
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS on ai_summary_usage
ALTER TABLE ai_summary_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own ai_summary_usage"
  ON ai_summary_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (done by edge function)
CREATE POLICY "Service role can manage ai_summary_usage"
  ON ai_summary_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Index for fast lookups by user + month
CREATE INDEX IF NOT EXISTS idx_ai_summary_usage_user_month ON ai_summary_usage(user_id, month);

