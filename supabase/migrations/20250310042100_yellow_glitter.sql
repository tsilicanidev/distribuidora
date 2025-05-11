/*
  # Profile Enhancements Migration

  1. Indexes
    - Add unique index on email
    - Add index on role
    - Add index on created_at
  
  2. Constraints
    - Add role validation check constraint
    - Add email format check constraint
  
  3. Security
    - Add RLS policies for admin operations
    - Add trigger for role change protection

  Note: This migration is designed to be run with admin privileges
*/

-- Disable RLS temporarily to allow migration
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Update any invalid roles to 'user' before adding constraint
UPDATE profiles 
SET role = 'user' 
WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'seller', 'driver', 'warehouse', 'master', 'user');

-- Add role validation check constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_valid_role;

ALTER TABLE profiles 
  ADD CONSTRAINT check_valid_role 
  CHECK (role IN ('admin', 'manager', 'seller', 'driver', 'warehouse', 'master', 'user'));

-- Add email format check constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS check_valid_email;

ALTER TABLE profiles 
  ADD CONSTRAINT check_valid_email 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create function for role change validation
CREATE OR REPLACE FUNCTION check_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow all changes during migration
  IF current_setting('app.is_migration', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check role changes
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only admin and master can change roles
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'master')
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_role_change_trigger ON profiles;

-- Create new trigger
CREATE TRIGGER check_role_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_role_change();

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admin operations" ON profiles;

-- Create new policies
CREATE POLICY "Allow admin operations"
  ON profiles
  TO authenticated
  USING (
    auth.uid() = id OR -- Users can read their own profile
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    auth.uid() = id OR -- Users can update their own profile
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'master')
    )
  );

-- Set migration flag to true to bypass role check trigger
DO $$
BEGIN
  PERFORM set_config('app.is_migration', 'true', true);
END $$;