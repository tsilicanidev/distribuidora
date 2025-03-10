/*
  # Add Stock Movements Table
  
  1. New Tables
    - stock_movements: Track product stock changes
    
  2. Policies
    - Basic RLS policies for stock movements
*/

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  reference_id uuid,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies for stock_movements
CREATE POLICY "Staff can view stock movements"
  ON stock_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Staff can create stock movements"
  ON stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'warehouse')
    )
  );