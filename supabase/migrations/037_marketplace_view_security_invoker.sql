-- Supabase security lint: views use owner privileges unless explicitly marked
-- security_invoker. Run marketplace queries under the caller's RLS context.
ALTER VIEW public.marketplace_collections_view
  SET (security_invoker = true);

REVOKE ALL ON public.marketplace_collections_view FROM PUBLIC;
REVOKE ALL ON public.marketplace_collections_view FROM anon;
GRANT SELECT ON public.marketplace_collections_view TO authenticated;

COMMENT ON VIEW public.marketplace_collections_view IS
  'Marketplace collection metadata evaluated with the caller''s RLS permissions.';
