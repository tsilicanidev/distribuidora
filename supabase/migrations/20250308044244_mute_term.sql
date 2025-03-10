/*
  # Create Admin User

  1. Changes
    - Insert admin user with master role
    - Email: admin@admin.com
    - Password: admin123
    
  2. Security
    - User will be created with master role
    - Profile will be automatically created via trigger
*/

-- Create admin user if it doesn't exist
DO $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Check if admin user already exists
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = 'admin@admin.com'
  ) INTO admin_exists;

  -- Create admin user if it doesn't exist
  IF NOT admin_exists THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@admin.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"master"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;