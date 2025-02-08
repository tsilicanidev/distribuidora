/*
  # Fix username login function

  1. Changes
    - Rewrite username_login function to properly handle user authentication
    - Fix record variable assignment issue
    - Return proper session format
*/

CREATE OR REPLACE FUNCTION public.username_login(
  username text,
  password text
) RETURNS json AS $$
DECLARE
  _user record;
  _session json;
BEGIN
  -- Get user by username
  SELECT 
    u.id,
    u.email,
    u.encrypted_password,
    u.raw_app_meta_data,
    u.raw_user_meta_data,
    u.role,
    u.created_at,
    p.username,
    p.full_name,
    p.role as profile_role
  INTO _user
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  WHERE p.username = username;

  -- Check if user exists
  IF _user.id IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  -- Verify password
  IF _user.encrypted_password = crypt(password, _user.encrypted_password) THEN
    -- Generate session
    SELECT
      json_build_object(
        'access_token', gen_random_uuid()::text,
        'token_type', 'bearer',
        'expires_in', extract(epoch from interval '1 hour')::integer,
        'refresh_token', gen_random_uuid()::text,
        'user', json_build_object(
          'id', _user.id,
          'email', _user.email,
          'role', _user.role,
          'app_metadata', _user.raw_app_meta_data,
          'user_metadata', _user.raw_user_meta_data,
          'created_at', _user.created_at
        )
      ) INTO _session;

    RETURN json_build_object(
      'session', _session,
      'user', json_build_object(
        'id', _user.id,
        'email', _user.email,
        'username', _user.username,
        'full_name', _user.full_name,
        'role', _user.profile_role
      )
    );
  ELSE
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;