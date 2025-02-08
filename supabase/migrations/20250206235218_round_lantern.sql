-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Create admin user with proper credentials
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if admin user exists
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
      updated_at,
      confirmation_token,
      recovery_token,
      instance_id,
      is_super_admin
    )
    VALUES (
      'tsilicani@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Usuario Master"}',
      'authenticated',
      'authenticated',
      now(),
      now(),
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex'),
      '00000000-0000-0000-0000-000000000000',
      false
    )
    RETURNING id INTO admin_id;

    -- Create admin profile
    INSERT INTO profiles (id, full_name, role)
    VALUES (admin_id, 'Usuario Master', 'admin');
  END IF;
END $$;