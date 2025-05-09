-- Drop existing delivery_note_items and delivery_notes tables
DROP TABLE IF EXISTS delivery_note_items CASCADE;
DROP TABLE IF EXISTS delivery_notes CASCADE;

-- Create delivery_notes table with proper relationships
CREATE TABLE delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  route_id uuid NOT NULL REFERENCES delivery_routes(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  helper_id uuid REFERENCES drivers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
  total_weight numeric NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
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
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  weight numeric NOT NULL DEFAULT 0,
  volume numeric NOT NULL DEFAULT 0,
  delivery_sequence integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery_notes
CREATE POLICY "delivery_notes_read"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "delivery_notes_write"
  ON delivery_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager', 'warehouse')
      )
    )
  );

-- Create policies for delivery_note_items
CREATE POLICY "delivery_note_items_read"
  ON delivery_note_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "delivery_note_items_write"
  ON delivery_note_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager', 'warehouse')
      )
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_notes_vehicle ON delivery_notes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_driver ON delivery_notes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_helper ON delivery_notes(helper_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(date);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_note ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_order ON delivery_note_items(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_product ON delivery_note_items(product_id);

-- Grant necessary permissions
GRANT ALL ON delivery_notes TO authenticated;
GRANT ALL ON delivery_note_items TO authenticated;