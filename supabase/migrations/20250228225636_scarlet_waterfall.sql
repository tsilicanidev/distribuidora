-- Create or replace function to check admin permissions
CREATE OR REPLACE FUNCTION auth.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email IN ('admin@admin.com', 'tsilicani@gmail.com', 'master@master.com')
        OR raw_user_meta_data->>'role' = 'admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy to allow admin users to manage other users
CREATE POLICY admin_manage_users ON auth.users
FOR ALL
TO authenticated
USING (auth.check_is_admin())
WITH CHECK (auth.check_is_admin());

-- Grant necessary permissions to admin users
GRANT EXECUTE ON FUNCTION auth.check_is_admin TO authenticated;
GRANT ALL ON auth.users TO authenticated;
GRANT ALL ON auth.refresh_tokens TO authenticated;

-- Update user management policies
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Ensure admin users have the correct role in their metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email IN ('admin@admin.com', 'tsilicani@gmail.com', 'master@master.com');