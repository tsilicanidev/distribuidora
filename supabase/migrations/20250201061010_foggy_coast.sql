/*
  # Update admin user details

  Updates the existing admin user with new information:
  - Full Name: Usuario Master
  - Username: admin
  - Email: tsilicani@gmail.com (valid email format)
  - Password: admin123
*/

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id
  FROM profiles
  WHERE username = 'admin'
  LIMIT 1;

  -- Update auth.users table
  UPDATE auth.users
  SET 
    email = 'tsilicani@gmail.com',
    encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = jsonb_build_object(
      'username', 'admin',
      'full_name', 'Usuario Master'
    ),
    updated_at = now()
  WHERE id = admin_id;

  -- Update profiles table
  UPDATE profiles
  SET 
    full_name = 'Usuario Master',
    updated_at = now()
  WHERE id = admin_id;
END $$;