-- Drop existing policies and functions
DO $$ 
BEGIN
  -- Only drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enable_profiles_read' AND tablename = 'profiles') THEN
    DROP POLICY "enable_profiles_read" ON profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enable_profiles_write' AND tablename = 'profiles') THEN
    DROP POLICY "enable_profiles_write" ON profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_users' AND tablename = 'users' AND schemaname = 'auth') THEN
    DROP POLICY admin_manage_users ON auth.users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_read' AND tablename = 'profiles') THEN
    DROP POLICY "profiles_read" ON profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_write' AND tablename = 'profiles') THEN
    DROP POLICY "profiles_write" ON profiles;
  END IF;
END $$;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS handle_admin_operation() CASCADE;
DROP FUNCTION IF EXISTS auth.check_is_admin() CASCADE;

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

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
      ELSE 'user'
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
      ELSE 'user'
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
  EXECUTE FUNCTION public.handle_new_user();

-- Create policies for profiles with unique names
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_modify_policy"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    auth.check_is_admin()
  );

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin user management with unique name
CREATE POLICY auth_users_admin_policy ON auth.users
FOR ALL
TO authenticated
USING (auth.check_is_admin())
WITH CHECK (auth.check_is_admin());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.check_is_admin TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Update admin user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'full_name', 'Admin'
)
WHERE email = 'admin@admin.com';

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
  role = 'admin',
  updated_at = now();