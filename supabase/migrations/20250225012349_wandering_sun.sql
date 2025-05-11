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
DROP POLICY IF EXISTS admin_manage_users ON auth.users;
CREATE POLICY admin_manage_users ON auth.users
FOR ALL
TO authenticated
USING (auth.check_is_admin())
WITH CHECK (auth.check_is_admin());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.check_is_admin TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Update admin user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email IN ('admin@admin.com', 'tsilicani@gmail.com', 'master@master.com')
AND raw_user_meta_data->>'role' IS NULL;

-- Create function to handle admin operations
CREATE OR REPLACE FUNCTION handle_admin_operation()
RETURNS trigger AS $$
BEGIN
  IF NOT auth.check_is_admin() THEN
    RAISE EXCEPTION 'Only admin users can perform this operation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for admin operations
DROP TRIGGER IF EXISTS ensure_admin_user ON auth.users;
CREATE TRIGGER ensure_admin_user
  BEFORE INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_admin_operation();