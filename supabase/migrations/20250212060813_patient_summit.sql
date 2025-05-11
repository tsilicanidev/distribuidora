/*
  # Fix Database Relationships and Missing Tables

  1. Changes
    - Add missing relationships between tables
    - Add missing fields to existing tables
    - Fix foreign key constraints
  
  2. Security
    - Update RLS policies for new relationships
*/

-- Add missing relationship between stock_movements and profiles
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS created_by_profile uuid REFERENCES profiles(id);

-- Update existing stock_movements to link to profiles
UPDATE stock_movements
SET created_by_profile = created_by
WHERE created_by_profile IS NULL;

-- Add missing relationship between delivery_notes and fiscal_invoices
ALTER TABLE fiscal_invoices
ADD COLUMN IF NOT EXISTS delivery_note_id uuid REFERENCES delivery_notes(id);

-- Create sales_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  total_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on sales_orders
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for sales_orders
CREATE POLICY "Enable read access for authenticated users"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for sellers"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

CREATE POLICY "Enable update for staff"
  ON sales_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'manager')
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by_profile ON stock_movements(created_by_profile);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_seller ON sales_orders(seller_id);