-- Drop existing policies for profiles
DROP POLICY IF EXISTS "profiles_unrestricted" ON profiles;
DROP POLICY IF EXISTS "enable_profiles_read" ON profiles;
DROP POLICY IF EXISTS "enable_profiles_write" ON profiles;

-- Create new policies for profiles
CREATE POLICY "profiles_master_access"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email = 'tsilicani@gmail.com'
    )
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email = 'tsilicani@gmail.com'
    )
  );

-- Ensure master user has proper role
DO $$
BEGIN
  -- Update or create master user profile
  INSERT INTO profiles (
    id,
    full_name,
    role,
    created_at,
    updated_at
  )
  SELECT 
    id,
    'Usuario Master',
    'master',
    now(),
    now()
  FROM auth.users
  WHERE email = 'tsilicani@gmail.com'
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = 'Usuario Master',
    role = 'master',
    updated_at = now();
END $$;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;