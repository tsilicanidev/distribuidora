-- Drop existing policies
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_write" ON customers;

-- Create new simplified policy with no restrictions
CREATE POLICY "customers_all_operations"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure proper permissions are granted
GRANT ALL ON customers TO authenticated;