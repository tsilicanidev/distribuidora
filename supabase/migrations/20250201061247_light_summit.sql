/*
  # Fix username_login function parameter order
  
  1. Drop existing function
  2. Recreate with parameters matching frontend call order
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Recreate the function with parameters matching frontend call order
CREATE FUNCTION public.username_login(
  password text,
  username text
) RETURNS json AS $$
DECLARE
  _user record;
  result json;
BEGIN
  -- Get user by username with properly qualified column references
  SELECT 
    u.id,
    u.email,
    u.encrypted_password,
    u.raw_app_meta_data,
    u.raw_user_meta_data,
    u.created_at,
    p.username,
    p.full_name,
    p.role
  INTO _user
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  WHERE p.username = username;

  -- Check if user exists
  IF _user.id IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  -- Verify password
  IF auth.verify_password(password, _user.encrypted_password) THEN
    -- Create new session using auth.sign_in
    SELECT auth.sign_in('email', _user.email, password) INTO result;

    -- Return combined result
    RETURN json_build_object(
      'session', result->'session',
      'user', json_build_object(
        'id', _user.id,
        'email', _user.email,
        'username', _user.username,
        'full_name', _user.full_name,
        'role', _user.role
      )
    );
  ELSE
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;