-- Drop any existing problematic functions
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Create admin user with proper credentials
DO $$
DECLARE
  admin_id uuid;
  admin_email text := 'tsilicani@gmail.com';
  admin_password text := 'admin123';
BEGIN
  -- First check if admin user exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_id IS NULL THEN
    -- Generate new UUID for admin
    admin_id := gen_random_uuid();
    
    -- Create new admin user
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
      updated_at,
      confirmation_token,
      recovery_token
    )
    VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email']
      ),
      jsonb_build_object(
        'full_name', 'Usuario Master'
      ),
      'authenticated',
      'authenticated',
      now(),
      now(),
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex')
    );

    -- Create admin profile
    INSERT INTO profiles (id, full_name, role)
    VALUES (admin_id, 'Usuario Master', 'admin');
  ELSE
    -- Update existing admin user
    UPDATE auth.users
    SET 
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object(
        'full_name', 'Usuario Master'
      ),
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