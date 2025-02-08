/*
  # Fix Authentication and RLS Policies

  1. Changes
    - Remove recursive policies
    - Simplify RLS policies for profiles table
    - Update admin user creation
    - Clean up old schema

  2. Security
    - Enable RLS on profiles table
    - Add simplified policies for profiles access
*/

-- Clean up any existing problematic schema
DO $$ 
BEGIN
  -- Drop old functions and triggers
  DROP FUNCTION IF EXISTS public.username_login(text, text);
  DROP TRIGGER IF EXISTS validate_email_trigger ON auth.users;
  DROP FUNCTION IF EXISTS validate_email();
  DROP FUNCTION IF EXISTS is_valid_email(text);
END $$;

-- Remove all existing policies from profiles table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
  DROP POLICY IF EXISTS "Profiles are editable by admins only" ON profiles;
  DROP POLICY IF EXISTS "Profiles are insertable by authenticated users" ON profiles;
  DROP POLICY IF EXISTS "Profiles are updatable by authenticated users" ON profiles;
END $$;

-- Create new simplified policies for profiles
CREATE POLICY "Enable read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create admin user if not exists
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
      updated_at
    )
    VALUES (
      'tsilicani@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrator"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    )
    RETURNING id INTO admin_id;

    -- Create admin profile
    INSERT INTO profiles (id, full_name, role)
    VALUES (admin_id, 'Administrator', 'admin');
  END IF;
END $$;