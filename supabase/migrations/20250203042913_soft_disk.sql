DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- First check if admin user exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'tsilicani@gmail.com';

  IF admin_id IS NULL THEN
    -- Create new admin user
    INSERT INTO auth.users (
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
      'tsilicani@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin User"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    RETURNING id INTO admin_id;
  ELSE
    -- Update existing admin user
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"name":"Admin User"}',
      updated_at = now()
    WHERE id = admin_id;
  END IF;

  -- Create or update admin profile
  INSERT INTO profiles (id, name, full_name, role)
  VALUES (admin_id, 'Admin User', 'Admin User', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
END $$;