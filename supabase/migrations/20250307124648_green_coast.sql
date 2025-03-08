/*
  # Fix Order Creation Permissions

  1. Changes
    - Update RLS policies for sales_orders and sales_order_items tables
    - Add policies to allow order creation via customer links
    - Fix permission issues for public access

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated and public users
    - Ensure proper validation of customer links
*/

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users full access to orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow public order creation with valid link" ON sales_orders;
DROP POLICY IF EXISTS "Allow public order reading with valid link" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to create orders with valid link" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to read orders with valid link" ON sales_orders;
DROP POLICY IF EXISTS "Allow authenticated users full access to order items" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public order items creation with valid link" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public order items reading with valid link" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public users to create order items with valid link" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public users to read order items with valid link" ON sales_order_items;

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create new policies for sales_orders
CREATE POLICY "authenticated_users_orders_access" ON sales_orders
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_orders_insert" ON sales_orders
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

CREATE POLICY "public_orders_select" ON sales_orders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

-- Create new policies for sales_order_items
CREATE POLICY "authenticated_users_order_items_access" ON sales_order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_order_items_insert" ON sales_order_items
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

CREATE POLICY "public_order_items_select" ON sales_order_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );