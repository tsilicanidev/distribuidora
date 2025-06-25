-- Drop existing tables to recreate them with proper structure
DROP TABLE IF EXISTS fiscal_invoices CASCADE;
DROP TABLE IF EXISTS delivery_note_items CASCADE;
DROP TABLE IF EXISTS delivery_notes CASCADE;

-- Create delivery_notes table
CREATE TABLE delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  route_id uuid NOT NULL REFERENCES delivery_routes(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_note_items table
CREATE TABLE delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT,
  delivery_sequence integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create fiscal_invoices table
CREATE TABLE fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  series text NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Create unrestricted policies
CREATE POLICY "delivery_notes_unrestricted" ON delivery_notes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "delivery_note_items_unrestricted" ON delivery_note_items
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "fiscal_invoices_unrestricted" ON fiscal_invoices
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_notes_number ON delivery_notes(number);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(date);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_vehicle ON delivery_notes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_route ON delivery_notes(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_note ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_order ON delivery_note_items(order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_delivery ON fiscal_invoices(delivery_note_id);

-- Function to get next delivery note number
CREATE OR REPLACE FUNCTION get_next_delivery_note_number()
RETURNS text AS $$
DECLARE
  last_number text;
  next_number integer;
BEGIN
  SELECT number INTO last_number
  FROM delivery_notes
  WHERE number ~ '^\d+$'
  ORDER BY CAST(number AS integer) DESC
  LIMIT 1;
  
  IF last_number IS NULL THEN
    RETURN '000001';
  END IF;
  
  next_number := CAST(last_number AS integer) + 1;
  RETURN LPAD(next_number::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON delivery_notes TO authenticated;
GRANT ALL ON delivery_note_items TO authenticated;
GRANT ALL ON fiscal_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_delivery_note_number() TO authenticated;