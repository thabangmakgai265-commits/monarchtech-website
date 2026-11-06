-- Migration version recorded by Supabase: 20261103064519.
REVOKE SELECT ON TABLE public.client_reviews
FROM anon, authenticated;

GRANT SELECT (
  id,
  client_name,
  rating,
  review,
  package,
  verified,
  approved,
  created_at
)
ON TABLE public.client_reviews
TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
FROM PUBLIC, anon, authenticated;
