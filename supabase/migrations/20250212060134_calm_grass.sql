/*
  # Fix Authentication and Policies

  1. Changes
    - Simplify profile policies
    - Fix profile creation
    - Add proper role handling
    - Fix dashboard access

  2. Security
    - Maintain proper access control
    - Ensure consistent role management
*/

-- Drop existing policies and functions
DROP POLICY IF EXISTS "Public read access for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- Create simplified policies for profiles
CREATE POLICY "Enable read access for all users"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email = 'tsilicani@gmail.com'
    )
  );

CREATE POLICY "Enable update for users based on role"
  ON profiles FOR UPDATE
  TO authenticated
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

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_name text;
BEGIN
  -- Set initial values
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User');

  -- Handle master user
  IF NEW.email = 'tsilicani@gmail.com' THEN
    v_role := 'master';
    v_name := 'Usuario Master';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, v_name, v_role)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

  -- Update user metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', v_role,
    'full_name', v_name
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

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

-- Update dashboard access policies
DROP POLICY IF EXISTS "Allow dashboard access" ON products;
CREATE POLICY "Enable dashboard access"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;