-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_write_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on role" ON profiles;

-- Create new non-recursive policies for profiles
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
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
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
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
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
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

-- Update function to check user access without recursion
CREATE OR REPLACE FUNCTION check_user_access(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      email = 'tsilicani@gmail.com' OR
      raw_user_meta_data->>'role' = ANY(required_roles)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies for other tables to use the non-recursive check
DROP POLICY IF EXISTS "staff_manage_products" ON products;
CREATE POLICY "staff_manage_products"
  ON products FOR ALL
  TO authenticated
  USING (check_user_access(ARRAY['master', 'admin', 'manager', 'warehouse']));

DROP POLICY IF EXISTS "staff_manage_stock" ON stock_movements;
CREATE POLICY "staff_manage_stock"
  ON stock_movements FOR ALL
  TO authenticated
  USING (check_user_access(ARRAY['master', 'admin', 'manager', 'warehouse']));

DROP POLICY IF EXISTS "staff_manage_sales" ON sales_orders;
CREATE POLICY "staff_manage_sales"
  ON sales_orders FOR ALL
  TO authenticated
  USING (
    auth.uid() = seller_id OR
    check_user_access(ARRAY['master', 'admin', 'manager'])
  );

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth.users USING gin ((raw_user_meta_data->'role'));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;