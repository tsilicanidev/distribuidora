/*
  # User Management Trigger Update
  
  1. Changes
    - Add validation functions
    - Update trigger functions
    - Fix role checking logic
  
  2. Security
    - Add proper role validation
    - Ensure secure operations
*/

-- Create function to validate admin operations
CREATE OR REPLACE FUNCTION validate_admin_operation()
RETURNS TRIGGER AS $$
DECLARE
  current_role text;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE id = auth.uid();

  IF current_role NOT IN ('admin', 'master') THEN
    RAISE EXCEPTION 'Only admins can perform this operation';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check role changes
CREATE OR REPLACE FUNCTION check_role_change()
RETURNS TRIGGER AS $$
DECLARE
  current_role text;
  current_id uuid;
BEGIN
  SELECT id, raw_user_meta_data->>'role' INTO current_id, current_role
  FROM auth.users
  WHERE id = auth.uid();

  IF TG_OP = 'UPDATE' THEN
    -- Allow users to update their own profile if not changing role
    IF current_id = NEW.id AND NEW.role = OLD.role THEN
      RETURN NEW;
    END IF;

    -- Only admins can change roles
    IF NEW.role != OLD.role AND current_role NOT IN ('admin', 'master') THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers
DROP TRIGGER IF EXISTS before_profile_admin_operation ON profiles;
CREATE TRIGGER before_profile_admin_operation
  BEFORE INSERT OR DELETE OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_admin_operation();

DROP TRIGGER IF EXISTS check_role_change_trigger ON profiles;
CREATE TRIGGER check_role_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_role_change();

-- Update role validation
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_valid_role;

ALTER TABLE profiles
  ADD CONSTRAINT check_valid_role
  CHECK (role IN ('master', 'admin', 'manager', 'seller', 'driver', 'warehouse'));

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own basic info" ON profiles;
DROP POLICY IF EXISTS "Admin and Master can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_read_access" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_master_access" ON profiles;
DROP POLICY IF EXISTS "profiles_read_access_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_master_access_v2" ON profiles;

-- Create new policies with unique names
CREATE POLICY "profiles_read_access_v4"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_self_update_v4"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (
      role = (SELECT role FROM profiles WHERE id = auth.uid())
      OR 
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

CREATE POLICY "profiles_admin_master_access_v4"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'master')
    )
  );

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;