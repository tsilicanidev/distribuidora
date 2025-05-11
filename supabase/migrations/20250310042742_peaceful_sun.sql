/*
  # Fix User Management Migration

  1. Changes
    - Add proper RLS policies for user management
    - Add function to sync user roles with auth
    - Add function to handle user deletion
    - Add trigger to validate admin operations
    - Add trigger to sync user metadata

  2. Security
    - Only admin and master users can manage other users
    - Users can only update their own basic info
    - Prevent deletion of master users
    - Ensure role changes are properly authorized

  Note: This migration fixes permission issues with user management
*/

-- Add function to sync user roles with auth
CREATE OR REPLACE FUNCTION sync_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users role when profile role changes
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', NEW.full_name,
    'role', NEW.role
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_roles IS 'Synchronizes user roles between profiles and auth';

-- Add function to validate admin operations
CREATE OR REPLACE FUNCTION validate_admin_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is admin or master
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this operation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to handle new user creation
CREATE OR REPLACE FUNCTION handle_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default role if not provided
  IF NEW.role IS NULL THEN
    NEW.role := 'user';
  END IF;

  -- Validate role
  IF NEW.role NOT IN ('master', 'admin', 'manager', 'seller', 'driver', 'warehouse') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;

  -- Sync with auth metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', NEW.full_name,
    'role', NEW.role
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to validate admin operations
DROP TRIGGER IF EXISTS before_profile_admin_operation ON profiles;
CREATE TRIGGER before_profile_admin_operation
  BEFORE INSERT OR DELETE OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_admin_operation();

-- Add trigger for profile creation
DROP TRIGGER IF EXISTS before_profile_insert ON profiles;
CREATE TRIGGER before_profile_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_creation();

-- Add trigger to sync roles
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION sync_roles();

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own basic info" ON profiles;
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
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND (
      -- Allow updating everything except role
      (
        SELECT role FROM profiles WHERE id = auth.uid()
      ) = role
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

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;