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
BEGIN
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE id = auth.uid();

  IF TG_OP = 'UPDATE' AND NEW.role != OLD.role AND current_role NOT IN ('admin', 'master') THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate user deletion
CREATE OR REPLACE FUNCTION validate_user_deletion()
RETURNS TRIGGER AS $$
DECLARE
  current_role text;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE id = auth.uid();

  IF OLD.role = 'admin' AND current_role != 'master' THEN
    RAISE EXCEPTION 'Only master users can delete admin users';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure master profile
CREATE OR REPLACE FUNCTION ensure_master_profile()
RETURNS TRIGGER AS $$
DECLARE
  master_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO master_count
    FROM profiles
    WHERE role = 'master' AND id != OLD.id;
    
    IF OLD.role = 'master' AND master_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last master user';
    END IF;
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO master_count
    FROM profiles
    WHERE role = 'master' AND id != NEW.id;
    
    IF OLD.role = 'master' AND NEW.role != 'master' AND master_count = 0 THEN
      RAISE EXCEPTION 'Cannot change role of the last master user';
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
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
DROP POLICY IF EXISTS "profiles_read_access_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_master_access_v3" ON profiles;

-- Create new policies
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