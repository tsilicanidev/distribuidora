/*
  # Update admin user credentials

  1. Changes
    - Update admin user's username to 'admin'
    - Update admin user's password to 'admin123'
    - Ensure admin user has correct profile settings
*/

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  -- Update admin user's password and metadata
  UPDATE auth.users
  SET 
    encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = jsonb_build_object(
      'username', 'admin',
      'full_name', 'Administrator'
    ),
    updated_at = now()
  WHERE id = admin_id;

  -- Update admin profile
  UPDATE profiles
  SET 
    username = 'admin',
    full_name = 'Administrator',
    updated_at = now()
  WHERE id = admin_id;
END $$;