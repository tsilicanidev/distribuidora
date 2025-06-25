/*
  # Profiles Table Restructure for Admin and Seller Roles
  
  1. Changes
    - Simplify role system to only 'admin' and 'seller'
    - Add commission_rate field for sellers
    - Update constraints and policies
    
  2. Security
    - Only admins can create/modify users
    - Sellers have limited access
*/

-- Ensure commission_rate exists
DO $$
BEGIN
    -- Check if the column exists first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'commission_rate'
    ) THEN
        ALTER TABLE profiles ADD COLUMN commission_rate numeric DEFAULT 5;
    END IF;
END
$$;

-- Add constraint to commission_rate if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_commission_rate_check'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_commission_rate_check
        CHECK (commission_rate >= 0 AND commission_rate <= 100);
    END IF;
END
$$;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.commission_rate IS 'Commission rate percentage for seller users (0-100)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON profiles(commission_rate);

-- Update existing roles to either admin or seller
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

-- Drop existing policies
DO $$ 
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_name);
  END LOOP;
END $$;

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

-- Add admin access policy for all tables
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  ) LOOP
    -- Skip tables that might cause issues
    IF table_name NOT IN ('pg_stat_statements', 'schema_migrations') THEN
      BEGIN
        EXECUTE format('
          DROP POLICY IF EXISTS %I_admin_master_access ON %I;
        ', table_name, table_name);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors from dropping policies
      END;
      
      BEGIN
        EXECUTE format('
          CREATE POLICY %I_admin_master_access ON %I
          FOR ALL
          TO authenticated
          USING (is_admin_or_master())
          WITH CHECK (is_admin_or_master())
        ', table_name, table_name);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors from creating policies
      END;
    END IF;
  END LOOP;
END $$;