-- Drop existing policies
DROP POLICY IF EXISTS "customers_read_policy" ON customers;
DROP POLICY IF EXISTS "customers_write_policy" ON customers;

-- Ensure customers table has correct structure
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  fantasia text,
  loja text,
  cpf_cnpj text NOT NULL UNIQUE,
  ie text,
  simples text CHECK (simples IN ('sim', 'não')),
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  celular text,
  contato text,
  email text NOT NULL,
  email_nfe text,
  vendedor text,
  rede text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable customer read access"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable customer write access"
  ON customers FOR ALL
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_razao_social ON customers(razao_social);
CREATE INDEX IF NOT EXISTS idx_customers_cpf_cnpj ON customers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Grant necessary permissions
GRANT ALL ON customers TO authenticated;