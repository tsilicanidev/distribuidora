/*
  # Update customers table schema

  1. Changes
    - Rename existing columns
    - Add new columns for customer details
    - Add validation constraints
    - Maintain existing RLS policies

  2. New Columns
    - Company information (razao_social, fantasia, loja, ie, simples)
    - Address details (bairro, cidade, estado, cep)
    - Contact information (celular, contato, email_nfe)
    - Business details (vendedor, rede)
    - Banking information (3 banks)
    - Supplier references (3 suppliers)
*/

-- First rename the existing columns
ALTER TABLE customers 
  RENAME COLUMN name TO razao_social;

ALTER TABLE customers 
  RENAME COLUMN cnpj TO cpf_cnpj;

-- Then add new columns
ALTER TABLE customers
  ADD COLUMN fantasia text,
  ADD COLUMN loja text,
  ADD COLUMN ie text,
  ADD COLUMN simples text CHECK (simples IN ('sim', 'não')),
  ADD COLUMN bairro text,
  ADD COLUMN cidade text,
  ADD COLUMN estado text CHECK (estado ~ '^[A-Z]{2}$'),
  ADD COLUMN cep text,
  ADD COLUMN celular text,
  ADD COLUMN contato text,
  ADD COLUMN email_nfe text,
  ADD COLUMN vendedor text,
  ADD COLUMN rede text,
  ADD COLUMN banco1 text,
  ADD COLUMN agencia1 text,
  ADD COLUMN conta1 text,
  ADD COLUMN telefone_banco1 text,
  ADD COLUMN banco2 text,
  ADD COLUMN agencia2 text,
  ADD COLUMN conta2 text,
  ADD COLUMN telefone_banco2 text,
  ADD COLUMN banco3 text,
  ADD COLUMN agencia3 text,
  ADD COLUMN conta3 text,
  ADD COLUMN telefone_banco3 text,
  ADD COLUMN fornecedor1 text,
  ADD COLUMN telefone_fornecedor1 text,
  ADD COLUMN fornecedor2 text,
  ADD COLUMN telefone_fornecedor2 text,
  ADD COLUMN fornecedor3 text,
  ADD COLUMN telefone_fornecedor3 text;

-- Add validation constraints
ALTER TABLE customers
  ADD CONSTRAINT cpf_cnpj_format CHECK (
    (cpf_cnpj ~ '^\d{11}$') OR  -- CPF format
    (cpf_cnpj ~ '^\d{14}$')     -- CNPJ format
  );

ALTER TABLE customers
  ADD CONSTRAINT cep_format CHECK (
    cep ~ '^\d{8}$' OR cep IS NULL
  );

ALTER TABLE customers
  ADD CONSTRAINT email_format CHECK (
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

ALTER TABLE customers
  ADD CONSTRAINT email_nfe_format CHECK (
    email_nfe ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email_nfe IS NULL
  );