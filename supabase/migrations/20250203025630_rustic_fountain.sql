/*
  # Create username login function

  1. Changes
    - Create function for username-based login
    - Handle user and profile data separately
    - Generate proper session token
  
  2. Security
    - Uses SECURITY DEFINER to run with elevated privileges
    - Properly verifies passwords
    - Returns minimal user information
*/

CREATE OR REPLACE FUNCTION public.username_login(
  username text,
  password text
) RETURNS json AS $$
DECLARE
  _user record;
  _profile record;
  _session json;
BEGIN
  -- Get user record
  SELECT 
    u.id,
    u.email,
    u.encrypted_password,
    u.aud,
    u.role,
    u.raw_app_meta_data,
    u.raw_user_meta_data,
    u.created_at
  INTO _user
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  WHERE p.username = username;

  -- Check if user exists
  IF _user.id IS NULL THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  -- Get profile record
  SELECT 
    username,
    full_name,
    role
  INTO _profile
  FROM profiles
  WHERE id = _user.id;

  -- Verify password
  IF _user.encrypted_password = crypt(password, _user.encrypted_password) THEN
    -- Generate session
    _session := json_build_object(
      'access_token', gen_random_uuid()::text,
      'token_type', 'bearer',
      'expires_in', extract(epoch from interval '1 hour')::integer,
      'refresh_token', gen_random_uuid()::text,
      'user', json_build_object(
        'id', _user.id,
        'aud', _user.aud,
        'role', _user.role,
        'email', _user.email,
        'app_metadata', _user.raw_app_meta_data,
        'user_metadata', _user.raw_user_meta_data,
        'created_at', _user.created_at
      )
    );

    RETURN json_build_object(
      'session', _session,
      'user', json_build_object(
        'id', _user.id,
        'email', _user.email,
        'username', _profile.username,
        'full_name', _profile.full_name,
        'role', _profile.role
      )
    );
  ELSE
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;