-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cpf_cnpj text NOT NULL,
  email text NOT NULL,
  telefone text,
  endereco text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS fantasia text,
  ADD COLUMN IF NOT EXISTS loja text,
  ADD COLUMN IF NOT EXISTS ie text,
  ADD COLUMN IF NOT EXISTS simples text CHECK (simples IN ('sim', 'não')),
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text CHECK (estado ~ '^[A-Z]{2}$'),
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS contato text,
  ADD COLUMN IF NOT EXISTS email_nfe text,
  ADD COLUMN IF NOT EXISTS vendedor text,
  ADD COLUMN IF NOT EXISTS rede text,
  ADD COLUMN IF NOT EXISTS banco1 text,
  ADD COLUMN IF NOT EXISTS agencia1 text,
  ADD COLUMN IF NOT EXISTS conta1 text,
  ADD COLUMN IF NOT EXISTS telefone_banco1 text,
  ADD COLUMN IF NOT EXISTS banco2 text,
  ADD COLUMN IF NOT EXISTS agencia2 text,
  ADD COLUMN IF NOT EXISTS conta2 text,
  ADD COLUMN IF NOT EXISTS telefone_banco2 text,
  ADD COLUMN IF NOT EXISTS banco3 text,
  ADD COLUMN IF NOT EXISTS agencia3 text,
  ADD COLUMN IF NOT EXISTS conta3 text,
  ADD COLUMN IF NOT EXISTS telefone_banco3 text,
  ADD COLUMN IF NOT EXISTS fornecedor1 text,
  ADD COLUMN IF NOT EXISTS telefone_fornecedor1 text,
  ADD COLUMN IF NOT EXISTS fornecedor2 text,
  ADD COLUMN IF NOT EXISTS telefone_fornecedor2 text,
  ADD COLUMN IF NOT EXISTS fornecedor3 text,
  ADD COLUMN IF NOT EXISTS telefone_fornecedor3 text;

-- Add validation constraints
DO $$
BEGIN
  -- Drop existing constraints if they exist
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS cpf_cnpj_format;
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS cep_format;
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS email_format;
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS email_nfe_format;

  -- Add new constraints
  ALTER TABLE customers
    ADD CONSTRAINT cpf_cnpj_format CHECK (
      (cpf_cnpj ~ '^\d{11}$') OR  -- CPF format
      (cpf_cnpj ~ '^\d{14}$')     -- CNPJ format
    ),
    ADD CONSTRAINT cep_format CHECK (
      cep ~ '^\d{8}$' OR cep IS NULL
    ),
    ADD CONSTRAINT email_format CHECK (
      email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    ADD CONSTRAINT email_nfe_format CHECK (
      email_nfe ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email_nfe IS NULL
    );
END $$;