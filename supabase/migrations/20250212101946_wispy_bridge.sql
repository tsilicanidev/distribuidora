/*
  # Update Fiscal Invoice Policies and Indexes
  
  1. Changes
    - Drop and recreate fiscal invoice policies
    - Add performance indexes
    
  2. Security
    - Ensure proper access control
    - Handle policy conflicts safely
*/

-- Drop all existing policies for fiscal_invoices
DO $$ 
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'fiscal_invoices'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON fiscal_invoices', policy_name);
  END LOOP;
END $$;

-- Create new policies with unique names
CREATE POLICY "fiscal_invoices_read_policy"
  ON fiscal_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "fiscal_invoices_insert_policy"
  ON fiscal_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

CREATE POLICY "fiscal_invoices_update_policy"
  ON fiscal_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Drop existing indexes to avoid conflicts
DROP INDEX IF EXISTS idx_fiscal_invoices_customer_id;
DROP INDEX IF EXISTS idx_fiscal_invoices_delivery_note_id;
DROP INDEX IF EXISTS idx_fiscal_invoices_status;
DROP INDEX IF EXISTS idx_fiscal_invoices_created_at;

-- Recreate indexes for better performance
CREATE INDEX idx_fiscal_invoices_customer_id ON fiscal_invoices(customer_id);
CREATE INDEX idx_fiscal_invoices_delivery_note_id ON fiscal_invoices(delivery_note_id);
CREATE INDEX idx_fiscal_invoices_status ON fiscal_invoices(status);
CREATE INDEX idx_fiscal_invoices_created_at ON fiscal_invoices(created_at);