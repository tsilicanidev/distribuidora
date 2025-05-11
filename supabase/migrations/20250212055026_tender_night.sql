/*
  # Fix Permissions and Role Synchronization

  1. Changes
    - Add public access to profiles for initial creation
    - Fix profile policies for proper role-based access
    - Add function to ensure profile exists
    - Add function to sync roles between auth and profiles

  2. Security
    - Maintain RLS while allowing necessary operations
    - Ensure proper role inheritance
    - Handle user metadata correctly
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on role" ON profiles;

-- Create new policies with proper access control
CREATE POLICY "Public read access for profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow profile updates"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to ensure profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    auth.uid(),
    COALESCE(current_setting('user.metadata.full_name', true), 'Unknown User'),
    COALESCE(current_setting('user.metadata.role', true), 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync roles
CREATE OR REPLACE FUNCTION sync_roles()
RETURNS trigger AS $$
BEGIN
  -- Update auth.users metadata when profile changes
  IF TG_OP = 'UPDATE' THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'role', NEW.role,
      'full_name', NEW.full_name
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role sync
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_roles();

-- Function to get current user profile
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS profiles AS $$
DECLARE
  profile_record profiles;
BEGIN
  SELECT * INTO profile_record
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    INSERT INTO profiles (id, full_name, role)
    VALUES (
      auth.uid(),
      COALESCE(current_setting('user.metadata.full_name', true), 'Unknown User'),
      COALESCE(current_setting('user.metadata.role', true), 'user')
    )
    RETURNING * INTO profile_record;
  END IF;
  
  RETURN profile_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for other tables to use profile role
CREATE OR REPLACE FUNCTION user_has_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for dashboard access
CREATE POLICY "Allow dashboard access"
  ON products FOR SELECT
  USING (
    user_has_role(ARRAY['admin', 'manager', 'warehouse'])
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IS NOT NULL
    )
  );