-- Drop existing functions and policies
DROP FUNCTION IF EXISTS auth.check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS handle_admin_operation() CASCADE;
DROP POLICY IF EXISTS admin_manage_users ON auth.users;

-- Create simplified admin check function
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

-- Create policy for admin user management
CREATE POLICY admin_manage_users ON auth.users
FOR ALL
TO authenticated
USING (auth.check_is_admin())
WITH CHECK (auth.check_is_admin());

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.check_is_admin TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Clean up non-admin users
DELETE FROM auth.users
WHERE email != 'admin@admin.com';

-- Update admin user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'full_name', 'Admin'
)
WHERE email = 'admin@admin.com';

-- Clean up profiles table
DELETE FROM public.profiles
WHERE email != 'admin@admin.com';

-- Update admin profile
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
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with proper role
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    CASE 
      WHEN NEW.email = 'admin@admin.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = CASE 
      WHEN NEW.email = 'admin@admin.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', EXCLUDED.role)
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create policies for profiles
DROP POLICY IF EXISTS "enable_profiles_read" ON profiles;
DROP POLICY IF EXISTS "enable_profiles_write" ON profiles;

CREATE POLICY "enable_profiles_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_profiles_write"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    auth.check_is_admin()
  );