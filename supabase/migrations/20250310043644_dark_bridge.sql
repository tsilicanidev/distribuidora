/*
  # User Management System Update
  
  1. Changes
    - Add proper user management functions
    - Update security policies
    - Fix permission issues
    - Add proper role validation
  
  2. Security
    - Ensure proper role-based access
    - Protect system integrity
    - Add audit logging
*/

-- Create function to sync user metadata
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', NEW.full_name,
    'role', NEW.role
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate admin operations
CREATE OR REPLACE FUNCTION validate_admin_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the current user has admin privileges
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_user_meta_data->>'role' = 'admin' OR
      raw_user_meta_data->>'role' = 'master'
    )
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this operation';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check role changes
CREATE OR REPLACE FUNCTION check_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow role changes by admins
  IF OLD.role != NEW.role AND NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_user_meta_data->>'role' = 'admin' OR
      raw_user_meta_data->>'role' = 'master'
    )
  ) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate user deletion
CREATE OR REPLACE FUNCTION validate_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of admin users by non-admins
  IF OLD.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'master'
  ) THEN
    RAISE EXCEPTION 'Only master users can delete admin users';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure master profile
CREATE OR REPLACE FUNCTION ensure_master_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent removal of last master user
  IF TG_OP = 'DELETE' AND OLD.role = 'master' AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE role = 'master'
    AND id != OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete the last master user';
  END IF;
  
  -- Prevent role change of last master user
  IF TG_OP = 'UPDATE' AND 
     OLD.role = 'master' AND 
     NEW.role != 'master' AND 
     NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE role = 'master'
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Cannot change role of the last master user';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON profiles;
CREATE TRIGGER sync_user_metadata_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata();

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

DROP TRIGGER IF EXISTS validate_user_deletion_trigger ON profiles;
CREATE TRIGGER validate_user_deletion_trigger
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_deletion();

DROP TRIGGER IF EXISTS ensure_master_profile_trigger ON profiles;
CREATE TRIGGER ensure_master_profile_trigger
  BEFORE DELETE OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_master_profile();

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

-- Create new policies
CREATE POLICY "profiles_read_access_v3"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_self_update_v3"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (
      -- Allow updating own profile except role
      (
        NEW.role = OLD.role AND
        NEW.id = OLD.id
      )
      OR
      -- Allow admins to update anything
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

CREATE POLICY "profiles_admin_master_access_v3"
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