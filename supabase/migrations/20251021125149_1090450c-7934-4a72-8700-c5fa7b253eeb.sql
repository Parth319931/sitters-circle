-- Update the handle_new_user function to create sitter profile for sitter role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  
  -- Insert role based on signup selection, default to 'owner' if not specified
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role')::app_role, 'owner'));
  
  -- If user is signing up as a sitter, create a sitter profile with default values
  IF COALESCE((new.raw_user_meta_data->>'role')::app_role, 'owner') = 'sitter' THEN
    INSERT INTO public.sitters (user_id, hourly_rate, experience_years, bio, available)
    VALUES (new.id, 25.00, 0, 'New pet sitter - profile setup in progress', true);
  END IF;
  
  RETURN new;
END;
$function$;