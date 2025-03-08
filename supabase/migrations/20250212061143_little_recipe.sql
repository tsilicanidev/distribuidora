/*
  # Update Policies and Add Fiscal Invoices Support

  1. Changes
    - Drop existing policies safely
    - Add fiscal invoices support
    - Add necessary indexes
  
  2. Security
    - Enable proper access control
    - Add function security
*/

-- First check if policies exist before dropping
DO $$ 
BEGIN
  -- Drop policies only if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users' AND tablename = 'fiscal_invoices') THEN
    DROP POLICY "Enable read access for authenticated users" ON fiscal_invoices;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for staff' AND tablename = 'fiscal_invoices') THEN
    DROP POLICY "Enable insert for staff" ON fiscal_invoices;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update for staff' AND tablename = 'fiscal_invoices') THEN
    DROP POLICY "Enable update for staff" ON fiscal_invoices;
  END IF;
END $$;

-- Create new policies for fiscal invoices
CREATE POLICY "Enable fiscal invoice read access"
  ON fiscal_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable fiscal invoice insert for staff"
  ON fiscal_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

CREATE POLICY "Enable fiscal invoice update for staff"
  ON fiscal_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Add function to generate next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS text AS $$
DECLARE
  last_number text;
  next_number integer;
BEGIN
  SELECT number INTO last_number
  FROM fiscal_invoices
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF last_number IS NULL THEN
    RETURN '000001';
  END IF;
  
  next_number := (last_number::integer + 1);
  RETURN LPAD(next_number::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_next_invoice_number() TO authenticated;

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_created_at ON fiscal_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_number ON fiscal_invoices(number);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_customer_id ON fiscal_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_delivery_note_id ON fiscal_invoices(delivery_note_id);