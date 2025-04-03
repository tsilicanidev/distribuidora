/*
  # Fix Infinite Recursion in Profiles RLS Policies
  
  1. Changes
    - Drop existing policies that cause infinite recursion
    - Create new non-recursive policies for profiles table
    - Fix permission issues for profile access
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion in policy evaluation
    - Allow proper access to commission_rate field
*/

-- Drop existing policies that might be causing recursion
DO $$ 
BEGIN
  -- Drop all existing policies for profiles
  FOR i IN 1..10 LOOP  -- Assuming we won't have more than 10 versions
    EXECUTE format('DROP POLICY IF EXISTS "profiles_read_access_v%s" ON profiles', i);
    EXECUTE format('DROP POLICY IF EXISTS "profiles_self_update_v%s" ON profiles', i);
    EXECUTE format('DROP POLICY IF EXISTS "profiles_admin_master_access_v%s" ON profiles', i);
  END LOOP;
  
  -- Drop other possible policy names
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own basic info" ON profiles;
  DROP POLICY IF EXISTS "Admin and Master can manage all profiles" ON profiles;
  DROP POLICY IF EXISTS "profiles_read_access" ON profiles;
  DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
  DROP POLICY IF EXISTS "profiles_admin_master_access" ON profiles;
  DROP POLICY IF EXISTS "profiles_unrestricted" ON profiles;
  DROP POLICY IF EXISTS "profiles_all_access_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_all_access_unrestricted" ON profiles;
  DROP POLICY IF EXISTS "profiles_master_access" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new simplified policies without recursion
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'admin@admin.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'admin@admin.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'admin@admin.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'master')
      )
    )
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;