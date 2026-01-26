-- Fix the plan_id constraint to include all valid plan types
-- The original constraint only allowed 'free', 'pro', 'team'
-- But we need to support 'free', 'pro', 'plus', 'premium'

-- Drop the old constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;

-- Add the new constraint with the correct plan IDs
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_check 
  CHECK (plan_id IN ('free', 'pro', 'plus', 'premium'));

