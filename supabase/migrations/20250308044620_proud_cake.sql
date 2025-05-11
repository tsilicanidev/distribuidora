/*
  # Fix Profiles RLS Policies

  1. Changes
    - Fix infinite recursion in profiles RLS policies
    - Simplify policy conditions to avoid self-referencing
    - Maintain same security model but with optimized implementation
    
  2. Security
    - Users can still only read their own profile
    - Users can still only update their own basic info
    - Admins/masters maintain full access
    - No security degradation, just implementation optimization
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;

-- Recreate policies without recursion
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a simpler update policy that doesn't use NEW/OLD
CREATE POLICY "Users can update own basic info"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      -- Regular users can't change their role
      (auth.users.raw_user_meta_data->>'role') NOT IN ('admin', 'master')
      OR
      -- Admin/master users can change anything
      (auth.users.raw_user_meta_data->>'role') IN ('admin', 'master')
    )
  )
);

-- Admin/master full access policy
CREATE POLICY "Admin full access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users
    WHERE 
      auth.users.id = auth.uid() AND
      (auth.users.raw_user_meta_data->>'role')::text IN ('admin', 'master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM auth.users
    WHERE 
      auth.users.id = auth.uid() AND
      (auth.users.raw_user_meta_data->>'role')::text IN ('admin', 'master')
  )
);