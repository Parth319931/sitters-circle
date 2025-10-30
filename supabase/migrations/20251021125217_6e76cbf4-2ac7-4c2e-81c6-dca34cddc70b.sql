-- Create sitter profiles for existing sitter users who don't have one
INSERT INTO public.sitters (user_id, hourly_rate, experience_years, bio, available)
SELECT 
  ur.user_id,
  25.00,
  0,
  'New pet sitter - profile setup in progress',
  true
FROM public.user_roles ur
WHERE ur.role = 'sitter'
  AND NOT EXISTS (
    SELECT 1 FROM public.sitters s WHERE s.user_id = ur.user_id
  );