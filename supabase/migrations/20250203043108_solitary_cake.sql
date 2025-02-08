-- Drop existing function
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Update admin user
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- First check if the user exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'tsilicani@gmail.com';

  IF admin_id IS NULL THEN
    -- Insert new admin user if it doesn't exist
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
      '{"full_name":"Usuario Master"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    RETURNING id INTO admin_id;
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"full_name":"Usuario Master"}',
      updated_at = now()
    WHERE id = admin_id;
  END IF;

  -- Update or insert admin profile
  INSERT INTO profiles (id, name, full_name, role)
  VALUES (admin_id, 'Usuario Master', 'Usuario Master', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET 
    name = 'Usuario Master',
    full_name = 'Usuario Master',
    role = 'admin',
    updated_at = now();
END $$;