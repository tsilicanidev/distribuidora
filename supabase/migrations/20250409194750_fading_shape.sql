/*
  # Profiles Table Restructure
  
  1. Changes
    - Simplify role system to only 'admin' and 'seller'
    - Add commission_rate field for sellers
    - Update constraints and policies
    
  2. Security
    - Only admins can create/modify users
    - Sellers have limited access
*/

-- Temporarily disable RLS to allow migration to run
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- First, update existing roles to either admin or seller
UPDATE profiles
SET role = CASE 
  WHEN role IN ('admin', 'master') THEN 'admin'
  ELSE 'seller'
END
WHERE role NOT IN ('admin', 'seller');

-- Update role constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_valid_role;

ALTER TABLE profiles
ADD CONSTRAINT check_valid_role
CHECK (role IN ('admin', 'seller'));

-- Ensure commission_rate exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 5 CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Add comment to explain the column
COMMENT ON COLUMN profiles.commission_rate IS 'Commission rate percentage for seller users (0-100)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON profiles(commission_rate);

-- Drop existing policies
DO $$ 
BEGIN
  -- Drop all existing policies for profiles
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_or_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new simplified policies
CREATE POLICY "enable_profiles_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_profiles_write"
  ON profiles FOR ALL
  TO authenticated
  USING (
    (auth.uid() = id) OR
    is_admin_or_master()
  )
  WITH CHECK (
    (auth.uid() = id) OR
    is_admin_or_master()
  );

-- Create function to validate admin operations
CREATE OR REPLACE FUNCTION validate_admin_operation_backup()
RETURNS TRIGGER AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Get admin status directly without using auth.uid()
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) INTO is_admin;

  -- Only allow admin users to perform admin operations
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can perform this operation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for admin operations
DROP TRIGGER IF EXISTS before_profile_admin_operation ON profiles;
CREATE TRIGGER before_profile_admin_operation
  BEFORE INSERT OR DELETE OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_admin_operation_backup();

-- Add master access policy for all tables
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I_admin_master_access ON %I;
      CREATE POLICY %I_admin_master_access ON %I
      FOR ALL
      TO authenticated
      USING (is_admin_or_master())
      WITH CHECK (is_admin_or_master())
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;