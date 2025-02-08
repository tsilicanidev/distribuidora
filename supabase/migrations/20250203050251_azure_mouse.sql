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

-- Add RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fiscal_invoices' AND policyname = 'Fiscal invoices are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Fiscal invoices are viewable by authenticated users"
      ON fiscal_invoices FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fiscal_invoices' AND policyname = 'Fiscal invoices are insertable by authenticated users'
  ) THEN
    CREATE POLICY "Fiscal invoices are insertable by authenticated users"
      ON fiscal_invoices FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fiscal_invoices' AND policyname = 'Fiscal invoices are updatable by authenticated users'
  ) THEN
    CREATE POLICY "Fiscal invoices are updatable by authenticated users"
      ON fiscal_invoices FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fiscal_invoice_items' AND policyname = 'Fiscal invoice items are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Fiscal invoice items are viewable by authenticated users"
      ON fiscal_invoice_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fiscal_invoice_items' AND policyname = 'Fiscal invoice items are insertable by authenticated users'
  ) THEN
    CREATE POLICY "Fiscal invoice items are insertable by authenticated users"
      ON fiscal_invoice_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fiscal_invoice_items' AND policyname = 'Fiscal invoice items are updatable by authenticated users'
  ) THEN
    CREATE POLICY "Fiscal invoice items are updatable by authenticated users"
      ON fiscal_invoice_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;