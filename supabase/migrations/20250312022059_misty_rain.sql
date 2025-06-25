/*
  # Schema update for customer orders

  1. New Tables
    - `customer_orders` - Stores orders created via external links
      - `id` (uuid, primary key)
      - `number` (text, unique) - Order number
      - `customer_id` (uuid) - Reference to customers table
      - `order_link_id` (uuid) - Reference to customer_order_links table
      - `status` (text) - Order status (pending, approved, rejected)
      - `total_amount` (numeric) - Total order amount
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `customer_order_items` - Stores items for each order
      - `id` (uuid, primary key)
      - `order_id` (uuid) - Reference to customer_orders table
      - `product_id` (uuid) - Reference to products table
      - `quantity` (integer) - Item quantity
      - `unit_price` (numeric) - Unit price
      - `total_price` (numeric) - Total price for this item

  2. Security
    - Enable RLS on both tables
    - Add policies for:
      - Public access for order creation via valid links
      - Admin/Manager access for order management
      - Read access for order owners

  3. Functions
    - Add function to auto-generate order numbers
*/

-- Create customer_orders table
CREATE TABLE IF NOT EXISTS customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_link_id uuid REFERENCES customer_order_links(id),
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT customer_orders_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create customer_order_items table
CREATE TABLE IF NOT EXISTS customer_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_number ON customer_orders(number);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_order_items_order ON customer_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_items_product ON customer_order_items(product_id);

-- Create policies for customer_orders

-- Admin and Manager can do everything
CREATE POLICY "admin_manager_access_orders" ON customer_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'manager')
    )
  );

-- Public can create orders with valid token
CREATE POLICY "public_create_orders" ON customer_orders
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.id = order_link_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

-- Public can read own orders
CREATE POLICY "public_read_orders" ON customer_orders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.id = order_link_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

-- Create policies for customer_order_items

-- Admin and Manager can do everything
CREATE POLICY "admin_manager_access_items" ON customer_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'manager')
    )
  );

-- Public can create items with valid token
CREATE POLICY "public_create_items" ON customer_order_items
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_orders
      JOIN customer_order_links ON customer_order_links.id = customer_orders.order_link_id
      WHERE customer_orders.id = customer_order_items.order_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

-- Public can read own items
CREATE POLICY "public_read_items" ON customer_order_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM customer_orders
      JOIN customer_order_links ON customer_order_links.id = customer_orders.order_link_id
      WHERE customer_orders.id = customer_order_items.order_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number text;
  current_year text := to_char(current_date, 'YY');
  base_number int;
BEGIN
  -- Get the highest order number for the current year
  SELECT COALESCE(MAX(SUBSTRING(number FROM '\d+')::int), 0)
  INTO base_number
  FROM customer_orders
  WHERE number LIKE current_year || '-%';

  -- Generate next number
  next_number := current_year || '-' || LPAD((base_number + 1)::text, 6, '0');

  RETURN next_number;
END;
$$;