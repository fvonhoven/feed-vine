-- Fix: grant authenticated role access to team tables
-- Without these grants, RLS policies on feed_collections that subquery
-- team_members fail with a 500 because the authenticated role can't
-- access the team_members table at all.

GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.team_invites TO authenticated;
GRANT SELECT ON public.teams TO anon;
GRANT SELECT ON public.team_members TO anon;
