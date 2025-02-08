-- Create admin user with proper credentials
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- First check if admin user exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'tsilicani@gmail.com';

  IF admin_id IS NULL THEN
    -- Generate new UUID for admin
    admin_id := gen_random_uuid();
    
    -- Create new admin user with explicit ID
    INSERT INTO auth.users (
      id,
      instance_id,
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
      '00000000-0000-0000-0000-000000000000',
      'tsilicani@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Usuario Master"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  ELSE
    -- Update existing admin user
    UPDATE auth.users
    SET
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"full_name": "Usuario Master"}',
      updated_at = now()
    WHERE id = admin_id;
  END IF;

  -- Create or update admin profile
  INSERT INTO profiles (id, full_name, role)
  VALUES (admin_id, 'Usuario Master', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
END $$;