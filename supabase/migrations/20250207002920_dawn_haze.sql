-- Create admin user with proper credentials
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Generate new UUID for admin
  admin_id := gen_random_uuid();
  
  -- Create new admin user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  )
  VALUES (
    admin_id,
    'tsilicani@gmail.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Usuario Master"}',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = '{"full_name":"Usuario Master"}',
    updated_at = now();

  -- Create or update admin profile
  INSERT INTO profiles (id, full_name, role)
  VALUES (admin_id, 'Usuario Master', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = 'Usuario Master',
    role = 'admin',
    updated_at = now();
END $$;