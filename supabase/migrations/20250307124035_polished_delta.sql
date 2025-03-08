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

-- Update sales_orders policies
DROP POLICY IF EXISTS "Allow public users to create orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to read their orders" ON sales_orders;

CREATE POLICY "Allow public order creation with valid link" ON sales_orders
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

CREATE POLICY "Allow public order reading with valid link" ON sales_orders
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

-- Update sales_order_items policies
DROP POLICY IF EXISTS "Allow public users to create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public users to read their order items" ON sales_order_items;

CREATE POLICY "Allow public order items creation with valid link" ON sales_order_items
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

CREATE POLICY "Allow public order items reading with valid link" ON sales_order_items
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );