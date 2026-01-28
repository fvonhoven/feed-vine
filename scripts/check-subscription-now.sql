-- Check your subscription right now
SELECT 
  s.id,
  s.user_id,
  u.email,
  s.plan_id,
  s.status,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.updated_at
FROM subscriptions s
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'fvonhoven@gmail.com';

