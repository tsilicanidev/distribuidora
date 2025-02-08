/*
  # Invoice System Setup

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `number` (text, unique)
      - `supplier_id` (uuid, references customers)
      - `issue_date` (timestamptz)
      - `total_amount` (decimal)
      - `status` (text: 'pending', 'processed', 'cancelled')
      - Timestamps
    
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, references invoices)
      - `product_id` (uuid, references products)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_price` (decimal)
      - Timestamps

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create invoices table
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES customers NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pending', 'processed', 'cancelled')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice items table
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Invoices are viewable by authenticated users"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoices are insertable by authenticated users"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invoices are updatable by authenticated users"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Invoice items are viewable by authenticated users"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoice items are insertable by authenticated users"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invoice items are updatable by authenticated users"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to process invoice and update stock
CREATE OR REPLACE FUNCTION process_invoice(invoice_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if invoice exists and is pending
  IF NOT EXISTS (
    SELECT 1 FROM invoices 
    WHERE id = invoice_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Invoice not found or already processed';
  END IF;

  -- Create stock movements for each item
  INSERT INTO stock_movements (
    product_id,
    quantity,
    type,
    reference_id,
    created_by
  )
  SELECT 
    i.product_id,
    i.quantity,
    'IN',
    invoice_id,
    auth.uid()
  FROM invoice_items i
  WHERE i.invoice_id = invoice_id;

  -- Update product stock quantities
  UPDATE products p
  SET stock_quantity = p.stock_quantity + i.quantity
  FROM invoice_items i
  WHERE i.invoice_id = invoice_id
  AND i.product_id = p.id;

  -- Mark invoice as processed
  UPDATE invoices
  SET 
    status = 'processed',
    updated_at = now()
  WHERE id = invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;