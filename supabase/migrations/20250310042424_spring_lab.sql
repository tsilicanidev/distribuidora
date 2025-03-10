/*
  # Fix User Permissions Migration

  1. Changes
    - Add master role to valid roles
    - Fix user deletion permissions
    - Add proper RLS policies for user management
    - Add trigger to sync user metadata with profiles
    - Add function to handle user deletion

  2. Security
    - Only master and admin users can manage other users
    - Users can manage their own profiles
    - Prevent deletion of master users
    - Ensure role changes are properly authorized

  Note: This migration fixes permission issues with user management
*/

-- Add function to sync user metadata
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata when profile changes
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', NEW.full_name,
    'role', NEW.role
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to sync metadata
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON profiles;
CREATE TRIGGER sync_user_metadata_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata();

-- Add function to validate user deletion
CREATE OR REPLACE FUNCTION validate_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user trying to delete is admin or master
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Only admin and master users can delete users';
  END IF;

  -- Prevent deletion of master users
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = OLD.id
    AND raw_user_meta_data->>'role' = 'master'
  ) THEN
    RAISE EXCEPTION 'Master users cannot be deleted';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for user deletion validation
DROP TRIGGER IF EXISTS validate_user_deletion_trigger ON profiles;
CREATE TRIGGER validate_user_deletion_trigger
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_deletion();

-- Update role validation to include master role
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_valid_role;

ALTER TABLE profiles
  ADD CONSTRAINT check_valid_role
  CHECK (role IN ('master', 'admin', 'manager', 'seller', 'driver', 'warehouse'));

-- Drop existing policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and Master can manage all profiles" ON profiles;

-- Create new policies
CREATE POLICY "Enable read access for all authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own basic info"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- Allow updating everything except role if user is not changing role
      (OLD.role = NEW.role) 
      OR 
      -- Only allow role changes by admin/master
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

CREATE POLICY "Admin and Master can manage all profiles"
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

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;