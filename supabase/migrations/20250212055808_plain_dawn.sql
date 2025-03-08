/*
  # Fix Policy Dependencies and Function Updates

  1. Changes
    - Drop dependent policies first
    - Update core functions
    - Recreate policies with proper dependencies

  2. Security
    - Maintain proper access control
    - Fix master user handling
    - Ensure consistent role management
*/

-- First drop dependent policies
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;

-- Now safe to drop and recreate functions
DROP FUNCTION IF EXISTS is_master() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

-- Function to check if user is master
CREATE OR REPLACE FUNCTION is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'tsilicani@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'tsilicani@gmail.com' THEN
    -- Create master profile
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      'Usuario Master',
      'master'
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'master',
        full_name = 'Usuario Master';

    -- Update user metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'role', 'master',
      'full_name', 'Usuario Master'
    )
    WHERE id = NEW.id;
  ELSE
    -- Create regular profile
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role safely
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
DECLARE
  user_role text;
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Check if master user
  IF user_email = 'tsilicani@gmail.com' THEN
    -- Ensure master profile exists
    INSERT INTO profiles (id, full_name, role)
    VALUES (
      auth.uid(),
      'Usuario Master',
      'master'
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'master',
        full_name = 'Usuario Master'
    RETURNING role INTO user_role;
  ELSE
    -- Get or create regular profile
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT FOUND THEN
      INSERT INTO profiles (id, full_name, role)
      VALUES (
        auth.uid(),
        COALESCE(current_setting('request.jwt.claims', true)::json->>'full_name', 'Unknown User'),
        COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'user')
      )
      RETURNING role INTO user_role;
    END IF;
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to check user roles including master
CREATE OR REPLACE FUNCTION user_has_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
    AND (
      u.email = 'tsilicani@gmail.com'
      OR p.role = ANY(required_roles)
      OR p.role = 'master'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies that depend on the functions
CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    is_master() OR
    (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'tsilicani@gmail.com'
  );

CREATE POLICY "Allow profile updates"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    is_master() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.email = 'tsilicani@gmail.com'
      )
    )
  );