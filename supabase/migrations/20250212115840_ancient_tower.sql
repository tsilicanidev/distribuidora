-- Drop existing policies
DROP POLICY IF EXISTS "customers_read" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

-- Create new policies with proper access control
CREATE POLICY "customers_read"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "customers_insert"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "customers_update"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
    )
  );

CREATE POLICY "customers_delete"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
    )
  );

-- Create function to check customer management permissions
CREATE OR REPLACE FUNCTION can_manage_customers()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      email = 'tsilicani@gmail.com' OR
      raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION can_manage_customers() TO authenticated;