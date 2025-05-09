-- Drop existing policies and functions
DROP POLICY IF EXISTS "enable_profiles_read" ON profiles;
DROP POLICY IF EXISTS "enable_profiles_write" ON profiles;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_master() CASCADE;

-- Create improved master/admin check function
CREATE OR REPLACE FUNCTION is_master_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      email IN ('master@master.com', 'tsilicani@gmail.com', 'admin@admin.com')
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new users
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
      WHEN NEW.email IN ('master@master.com', 'tsilicani@gmail.com', 'admin@admin.com') THEN 'admin'
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
      WHEN NEW.email IN ('master@master.com', 'tsilicani@gmail.com', 'admin@admin.com') THEN 'admin'
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
CREATE POLICY "enable_profiles_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_profiles_write"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    is_master_or_admin()
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Update existing admin users
DO $$
BEGIN
  UPDATE profiles
  SET role = 'admin'
  WHERE email IN ('master@master.com', 'tsilicani@gmail.com', 'admin@admin.com');
END $$;