/*
  # Add Indexes and Constraints

  1. Indexes
    - Add unique index on profiles(email)
    - Add index on role
    - Add index on created_at

  2. Constraints
    - Add role validation check constraint
    - Add email format check constraint
    - Add RLS policies for admin operations

  Note: This migration handles existing data by:
    1. First updating any invalid roles to 'user'
    2. Then adding constraints
    3. Adding indexes for performance
*/

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Update any invalid roles to 'user' before adding constraint
UPDATE profiles 
SET role = 'user' 
WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'seller', 'driver', 'warehouse');

-- Add role validation check constraint
DO $$ 
BEGIN
  ALTER TABLE profiles 
    ADD CONSTRAINT check_valid_role 
    CHECK (role IN ('admin', 'manager', 'seller', 'driver', 'warehouse', 'user'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add email format check constraint
DO $$ 
BEGIN
  ALTER TABLE profiles 
    ADD CONSTRAINT check_valid_email 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add RLS policies for admin operations
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow admin operations" ON profiles;
  
  CREATE POLICY "Allow admin operations"
    ON profiles
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'master')
      )
    );
END $$;

-- Add trigger to prevent role changes by non-admins
CREATE OR REPLACE FUNCTION check_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    -- Check if user is admin or master
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_role_change_trigger ON profiles;
CREATE TRIGGER check_role_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_role_change();