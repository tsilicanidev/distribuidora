/*
  # Create admin user

  1. Changes
    - Create admin user in auth.users table with proper UUID generation
    - Create corresponding profile in profiles table
    
  2. Security
    - Admin user will have full access through existing RLS policies
*/

DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
BEGIN
  -- Insert admin user
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
  VALUES (
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
  );

  -- Insert admin profile
  INSERT INTO profiles (id, name, role)
  VALUES (admin_id, 'Admin User', 'admin');
END $$;