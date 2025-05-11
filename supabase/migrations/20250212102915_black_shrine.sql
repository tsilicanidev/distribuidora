-- Fix customers table columns and policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update for users based on role" ON customers;

-- Create proper policies for customers
CREATE POLICY "customers_read_policy"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "customers_write_policy"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Fix profiles policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on role" ON profiles;

CREATE POLICY "profiles_read_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_write_policy"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Fix delivery notes related tables
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_read_policy"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "routes_write_policy"
  ON delivery_routes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_customers_razao_social ON customers(razao_social);
CREATE INDEX IF NOT EXISTS idx_customers_cpf_cnpj ON customers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, driver_status);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_name ON delivery_routes(name);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;