/*
  # Fix Sales Orders Relationships

  1. Changes
    - Drop and recreate sales_orders table with proper foreign key relationships
    - Add proper RLS policies
    - Add necessary indexes
    - Grant proper permissions
  
  2. Security
    - Enable RLS
    - Add policies for read/write access
*/

-- First drop dependent tables
DROP TABLE IF EXISTS delivery_note_items CASCADE;
DROP TABLE IF EXISTS delivery_notes CASCADE;
DROP TABLE IF EXISTS fiscal_invoices CASCADE;
DROP TABLE IF EXISTS sales_order_items CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;

-- Create sales_orders table with proper relationships
CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  total_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

-- Create sales_order_items table
CREATE TABLE sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Create delivery_notes table
CREATE TABLE delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL,
  vehicle_id uuid NOT NULL,
  route_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  helper_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
  total_weight numeric NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_route FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_driver FOREIGN KEY (driver_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_helper FOREIGN KEY (helper_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Create delivery_note_items table
CREATE TABLE delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  weight numeric NOT NULL DEFAULT 0,
  volume numeric NOT NULL DEFAULT 0,
  delivery_sequence integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_delivery_note FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Create fiscal_invoices table
CREATE TABLE fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  series text NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  customer_id uuid NOT NULL,
  delivery_note_id uuid,
  total_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_note FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for sales_orders
CREATE POLICY "Enable sales orders read access"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable sales orders write access"
  ON sales_orders FOR ALL
  TO authenticated
  USING (
    seller_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
    )
  );

-- Create policies for sales_order_items
CREATE POLICY "Enable sales order items read access"
  ON sales_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable sales order items write access"
  ON sales_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE id = sales_order_id
      AND (
        seller_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND (
            email = 'tsilicani@gmail.com' OR
            raw_user_meta_data->>'role' IN ('admin', 'manager')
          )
        )
      )
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_seller ON sales_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created ON sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_vehicle ON delivery_notes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_driver ON delivery_notes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_customer ON fiscal_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_delivery ON fiscal_invoices(delivery_note_id);

-- Grant necessary permissions
GRANT ALL ON sales_orders TO authenticated;
GRANT ALL ON sales_order_items TO authenticated;
GRANT ALL ON delivery_notes TO authenticated;
GRANT ALL ON delivery_note_items TO authenticated;
GRANT ALL ON fiscal_invoices TO authenticated;