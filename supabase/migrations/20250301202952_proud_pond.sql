-- Drop existing policy if it exists
DROP POLICY IF EXISTS "profiles_unrestricted" ON profiles;

-- Create new unrestricted policy with a unique name
CREATE POLICY "profiles_all_access_unrestricted"
  ON profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Update existing admin user metadata if exists
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'full_name', COALESCE(raw_user_meta_data->>'full_name', 'Admin')
)
WHERE email = 'admin@admin.com';

-- Update existing admin profile if exists
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
  COALESCE(raw_user_meta_data->>'full_name', 'Admin'),
  'admin',
  now(),
  now()
FROM auth.users
WHERE email = 'admin@admin.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, 'Admin'),
  role = 'admin',
  updated_at = now();