-- Drop existing policies first
DO $$ 
DECLARE
  r record;
BEGIN
  -- Drop all existing policies for profiles
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;

  -- Drop all existing policies for auth.users
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'auth'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users', r.policyname);
  END LOOP;
END $$;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS handle_admin_operation() CASCADE;
DROP FUNCTION IF EXISTS auth.check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create admin check function
CREATE OR REPLACE FUNCTION auth.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email = 'admin@admin.com'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create single unrestricted policy for profiles
CREATE POLICY "profiles_all_access"
  ON profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create single unrestricted policy for auth.users
CREATE POLICY "auth_users_all_access"
  ON auth.users FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.check_is_admin TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Update admin user metadata if exists
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'full_name', 'Admin'
)
WHERE email = 'admin@admin.com';

-- Update admin profile if exists
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  'Admin',
  'admin',
  now(),
  now()
FROM auth.users
WHERE email = 'admin@admin.com'
ON CONFLICT (id) DO NOTHING;