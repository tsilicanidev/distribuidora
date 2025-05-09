/*
  # Fix Authentication and Policies

  1. Changes
    - Add proper RLS policies for profiles
    - Fix profile creation and role handling
    - Add helper functions for auth checks
    - Ensure proper access to dashboard data

  2. Security
    - Maintain proper access control
    - Fix profile creation
    - Ensure consistent role management
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Public read access for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
    )
  );

-- Function to ensure user has profile
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_name text;
BEGIN
  -- Set role and name based on user
  IF NEW.email = 'tsilicani@gmail.com' THEN
    v_role := 'master';
    v_name := 'Usuario Master';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User');
  END IF;

  -- Create or update profile
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, v_name, v_role)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_profile();

-- Function to check user access level
CREATE OR REPLACE FUNCTION check_user_access(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
    AND (
      u.email = 'tsilicani@gmail.com' OR
      p.role = ANY(required_roles) OR
      p.role = 'master'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update dashboard access policy
DROP POLICY IF EXISTS "Allow dashboard access" ON products;
CREATE POLICY "Allow dashboard access"
  ON products FOR SELECT
  USING (
    check_user_access(ARRAY['admin', 'manager', 'warehouse', 'seller'])
  );

-- Ensure proper access to auth.users for role checks
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);