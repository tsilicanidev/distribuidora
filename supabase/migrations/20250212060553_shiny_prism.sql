/*
  # Create Fiscal Invoices Table and Add Missing Relationships

  1. New Tables
    - fiscal_invoices
      - Links to customers and delivery notes
      - Tracks invoice details and status
  
  2. Changes
    - Add missing indexes for performance
    - Remove duplicate constraint creation attempt
*/

-- Create fiscal_invoices table
CREATE TABLE IF NOT EXISTS fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  series text NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  delivery_note_id uuid REFERENCES delivery_notes(id),
  total_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on fiscal_invoices
ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Add policies for fiscal_invoices
CREATE POLICY "Enable read access for authenticated users"
  ON fiscal_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for staff"
  ON fiscal_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

CREATE POLICY "Enable update for staff"
  ON fiscal_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_customer ON fiscal_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_delivery_note ON fiscal_invoices(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_status ON fiscal_invoices(status);