/*
  # User Management System Update
  
  1. Changes
    - Add user metadata sync
    - Update role validation
    - Update access policies with unique names
  
  2. Security
    - Enable RLS
    - Add proper role-based access control
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

-- Add trigger for metadata sync
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON profiles;
CREATE TRIGGER sync_user_metadata_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata();

-- Update role validation
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_valid_role;

ALTER TABLE profiles
  ADD CONSTRAINT check_valid_role
  CHECK (role IN ('master', 'admin', 'manager', 'seller', 'driver', 'warehouse'));

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin and Master can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_read_access_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_master_access_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_read_access_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_master_access_v3" ON profiles;
DROP POLICY IF EXISTS "profiles_read_access_v4" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update_v4" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_master_access_v4" ON profiles;

-- Create new policies with unique names
CREATE POLICY "profiles_read_access_v5"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_self_update_v5"
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

CREATE POLICY "profiles_admin_master_access_v5"
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