-- Drop existing policies
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

-- Create new simplified policies with proper access control
CREATE POLICY "customers_select"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "customers_write"
  ON customers FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE email = 'tsilicani@gmail.com'
      OR raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Ensure proper permissions are granted
GRANT ALL ON customers TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_razao_social ON customers(razao_social);
CREATE INDEX IF NOT EXISTS idx_customers_cpf_cnpj ON customers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);