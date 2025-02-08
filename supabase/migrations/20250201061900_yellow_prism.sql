/*
  # Fix authentication schema
  
  1. Clean up old auth functions
  2. Ensure proper email authentication setup
  3. Create admin user with proper email format
*/

-- Drop old username login function if it exists
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Ensure proper auth schema setup
DO $$ 
BEGIN
  -- Drop email validation trigger if it exists
  DROP TRIGGER IF EXISTS validate_email_trigger ON auth.users;
  
  -- Drop email validation function if it exists
  DROP FUNCTION IF EXISTS validate_email();
END $$;

-- Create master admin user with proper email format
DO $$
DECLARE
  admin_id uuid;
  admin_email text := 'tsilicani@gmail.com';
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = admin_email;

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
      admin_email,
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