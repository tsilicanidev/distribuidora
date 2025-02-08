DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user's ID using role instead of username
  SELECT id INTO admin_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  -- Update auth.users table
  UPDATE auth.users
  SET 
    email = 'tsilicani@gmail.com',
    encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = jsonb_build_object(
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