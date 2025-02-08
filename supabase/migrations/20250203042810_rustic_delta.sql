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
  -- Check if admin user exists first
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
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Usuario Master"}',
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
      raw_user_meta_data = '{"full_name": "Usuario Master"}',
      updated_at = now()
    WHERE id = admin_id;
  END IF;

  -- Create or update admin profile
  INSERT INTO profiles (id, name, full_name, role)
  VALUES (admin_id, 'Usuario Master', 'Usuario Master', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
END $$;