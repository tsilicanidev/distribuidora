-- Drop existing tables if they exist
DROP TABLE IF EXISTS fiscal_invoice_items;
DROP TABLE IF EXISTS fiscal_invoices;

-- Create fiscal invoices table
CREATE TABLE fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  series text NOT NULL,
  delivery_note_id uuid REFERENCES delivery_notes NOT NULL,
  customer_id uuid REFERENCES customers NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('draft', 'issued', 'cancelled')) DEFAULT 'draft',
  xml_content text,
  created_by uuid REFERENCES profiles NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fiscal invoice items table
CREATE TABLE fiscal_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_invoice_id uuid REFERENCES fiscal_invoices ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  tax_code text NOT NULL,
  tax_rate decimal(5,2) NOT NULL,
  tax_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Fiscal invoices are viewable by authenticated users"
  ON fiscal_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Fiscal invoices are insertable by authenticated users"
  ON fiscal_invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Fiscal invoices are updatable by authenticated users"
  ON fiscal_invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Fiscal invoice items are viewable by authenticated users"
  ON fiscal_invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Fiscal invoice items are insertable by authenticated users"
  ON fiscal_invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Fiscal invoice items are updatable by authenticated users"
  ON fiscal_invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_fiscal_invoice(uuid);

-- Create function to generate fiscal invoice from delivery note
CREATE OR REPLACE FUNCTION generate_fiscal_invoice(delivery_note_id uuid)
RETURNS uuid AS $$
DECLARE
  new_invoice_id uuid;
  delivery_note record;
  next_number text;
BEGIN
  -- Get delivery note details
  SELECT * INTO delivery_note
  FROM delivery_notes
  WHERE id = delivery_note_id;

  -- Check if delivery note exists and is completed
  IF delivery_note IS NULL THEN
    RAISE EXCEPTION 'Delivery note not found';
  END IF;

  IF delivery_note.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot generate invoice for non-completed delivery note';
  END IF;

  -- Generate next invoice number
  SELECT 
    LPAD(COALESCE(MAX(SUBSTRING(number FROM '\d+')::integer), 0)::integer + 1, 6, '0')
  INTO next_number
  FROM fiscal_invoices;

  -- Create fiscal invoice
  INSERT INTO fiscal_invoices (
    number,
    series,
    delivery_note_id,
    customer_id,
    created_by
  )
  VALUES (
    next_number,
    '001',
    delivery_note_id,
    (SELECT customer_id FROM orders WHERE id = (
      SELECT order_id FROM delivery_note_items WHERE delivery_note_id = delivery_note.id LIMIT 1
    )),
    auth.uid()
  )
  RETURNING id INTO new_invoice_id;

  -- Create fiscal invoice items
  INSERT INTO fiscal_invoice_items (
    fiscal_invoice_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    tax_code,
    tax_rate,
    tax_amount
  )
  SELECT
    new_invoice_id,
    dni.product_id,
    dni.quantity,
    p.price,
    dni.quantity * p.price,
    'ICMS', -- Default tax code
    18.00,  -- Default tax rate
    (dni.quantity * p.price) * 0.18 -- Default tax calculation
  FROM delivery_note_items dni
  JOIN products p ON p.id = dni.product_id
  WHERE dni.delivery_note_id = delivery_note_id;

  -- Update invoice totals
  UPDATE fiscal_invoices
  SET 
    total_amount = (
      SELECT SUM(total_price)
      FROM fiscal_invoice_items
      WHERE fiscal_invoice_id = new_invoice_id
    ),
    tax_amount = (
      SELECT SUM(tax_amount)
      FROM fiscal_invoice_items
      WHERE fiscal_invoice_id = new_invoice_id
    )
  WHERE id = new_invoice_id;

  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;