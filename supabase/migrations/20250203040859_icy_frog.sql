DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
BEGIN
  -- Insert admin user with a new UUID
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
  )
  SELECT
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'tsilicani@gmail.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    encode(gen_random_bytes(32), 'hex')
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'tsilicani@gmail.com'
  );

  -- Create admin profile with all required fields
  INSERT INTO profiles (
    id,
    name,
    full_name,
    role
  )
  VALUES (
    COALESCE(
      (SELECT id FROM auth.users WHERE email = 'tsilicani@gmail.com'),
      admin_id
    ),
    'Admin User',
    'Admin User',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
END $$;