-- Check current subscription status
-- Run this in Supabase SQL Editor to see your subscription

SELECT 
  s.id,
  s.user_id,
  s.plan_id,
  s.status,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.created_at,
  s.updated_at,
  u.email
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.updated_at DESC
LIMIT 10;

