/*
  # Fix authentication system
  
  1. Clean up old schema
  2. Create admin user properly
*/

-- Clean up old schema
DO $$ 
BEGIN
  -- Drop old functions and triggers
  DROP FUNCTION IF EXISTS public.username_login(text, text);
  DROP TRIGGER IF EXISTS validate_email_trigger ON auth.users;
  DROP FUNCTION IF EXISTS validate_email();
  DROP FUNCTION IF EXISTS is_valid_email(text);
END $$;

-- Create master admin user
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if admin user already exists
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
      recovery_token
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
      encode(gen_random_bytes(32), 'hex')
    )
    RETURNING id INTO admin_id;

    -- Create admin profile
    INSERT INTO profiles (id, full_name, role)
    VALUES (admin_id, 'Usuario Master', 'admin');
  ELSE
    -- Update existing admin
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"full_name":"Usuario Master"}',
      updated_at = now()
    WHERE id = admin_id;

    -- Update admin profile
    UPDATE profiles
    SET 
      full_name = 'Usuario Master',
      role = 'admin',
      updated_at = now()
    WHERE id = admin_id;
  END IF;
END $$;