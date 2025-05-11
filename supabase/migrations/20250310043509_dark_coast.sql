/*
  # User Management Migration
  
  1. Changes
    - Add functions for user metadata sync
    - Add triggers for user management
    - Update role validation
    - Update RLS policies
  
  2. Security
    - Ensure proper role validation
    - Protect master users
    - Maintain data integrity
*/

-- Create function to sync user metadata
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get the user ID
  _user_id := COALESCE(NEW.id, OLD.id);
  
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', NEW.full_name,
    'role', NEW.role
  )
  WHERE id = _user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle master user
CREATE OR REPLACE FUNCTION handle_master_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow master role if no master exists
  IF NEW.role = 'master' AND EXISTS (
    SELECT 1 FROM profiles WHERE role = 'master'
  ) THEN
    RAISE EXCEPTION 'Master user already exists';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to ensure master profile
CREATE OR REPLACE FUNCTION ensure_master_profile()
RETURNS TRIGGER AS $$
DECLARE
  _current_role text;
  _other_masters int;
BEGIN
  -- Get current role for updates
  IF TG_OP = 'UPDATE' THEN
    _current_role := NEW.role;
  ELSE
    _current_role := NULL;
  END IF;

  -- Count other master users
  SELECT COUNT(*) INTO _other_masters
  FROM profiles 
  WHERE role = 'master' 
  AND id != COALESCE(NEW.id, OLD.id);

  -- Check if this would remove the last master
  IF (TG_OP = 'DELETE' OR _current_role != 'master') AND 
     EXISTS (SELECT 1 FROM profiles WHERE role = 'master') AND
     _other_masters = 0 THEN
    RAISE EXCEPTION 'Cannot remove last master user';
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

DROP TRIGGER IF EXISTS handle_master_user_trigger ON profiles;
CREATE TRIGGER handle_master_user_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_master_user();

DROP TRIGGER IF EXISTS ensure_master_profile_trigger ON profiles;
CREATE TRIGGER ensure_master_profile_trigger
  BEFORE UPDATE OR DELETE ON profiles
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

-- Create new policies with unique names
CREATE POLICY "profiles_read_access_v2"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_self_update_v2"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- Allow updating everything except role if user is not changing role
      (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()))
      OR 
      -- Only allow role changes by admin/master
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

CREATE POLICY "profiles_admin_master_access_v2"
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