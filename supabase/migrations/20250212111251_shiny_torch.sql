/*
  # Fix Customers Table Access

  1. Changes
    - Drop and recreate customers table with proper structure
    - Add proper RLS policies
    - Add necessary indexes
    - Grant proper permissions
  
  2. Security
    - Enable RLS
    - Add policies for read/write access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable customer read access" ON customers;
DROP POLICY IF EXISTS "Enable customer write access" ON customers;

-- Drop and recreate customers table with all required fields
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
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
  banco1 text,
  agencia1 text,
  conta1 text,
  telefone_banco1 text,
  banco2 text,
  agencia2 text,
  conta2 text,
  telefone_banco2 text,
  banco3 text,
  agencia3 text,
  conta3 text,
  telefone_banco3 text,
  fornecedor1 text,
  telefone_fornecedor1 text,
  fornecedor2 text,
  telefone_fornecedor2 text,
  fornecedor3 text,
  telefone_fornecedor3 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies with proper access control
CREATE POLICY "customers_select_policy"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "customers_insert_policy"
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

CREATE POLICY "customers_update_policy"
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

CREATE POLICY "customers_delete_policy"
  ON customers FOR DELETE
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_razao_social ON customers(razao_social);
CREATE INDEX IF NOT EXISTS idx_customers_cpf_cnpj ON customers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Grant necessary permissions
GRANT ALL ON customers TO authenticated;