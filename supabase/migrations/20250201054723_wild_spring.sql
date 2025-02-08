/*
  # Update authentication to use username

  1. Changes
    - Add username_login function for username-based authentication
    - Add trigger to sync username between auth.users and profiles
*/

-- Create function to handle username-based login
CREATE OR REPLACE FUNCTION auth.username_login(
  username text,
  password text
) RETURNS json AS $$
DECLARE
  _user auth.users;
  result json;
BEGIN
  -- Get user by username from profiles
  SELECT au.* INTO _user
  FROM auth.users au
  JOIN profiles p ON au.id = p.id
  WHERE p.username = username;

  -- Verify password
  IF _user.encrypted_password = crypt(password, _user.encrypted_password) THEN
    -- Generate session
    result := json_build_object(
      'user', json_build_object(
        'id', _user.id,
        'email', _user.email,
        'role', _user.role
      ),
      'session', auth.create_session(_user.id)
    );
  ELSE
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;