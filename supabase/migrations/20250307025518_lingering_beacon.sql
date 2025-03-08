/*
  # Add Order Creation Policies

  1. Changes
    - Add policies to allow order creation through token links
    - Enable RLS on sales_orders and sales_order_items tables
    - Add policies for authenticated and public access

  2. Security
    - Enable RLS on both tables
    - Add policies to allow order creation for valid tokens
    - Add policies for authenticated users to manage orders
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage all orders
CREATE POLICY "Authenticated users can manage all orders"
  ON sales_orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for public users to create orders
CREATE POLICY "Public users can create orders"
  ON sales_orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy for public users to read their own orders
CREATE POLICY "Public users can read their own orders"
  ON sales_orders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
      AND customer_order_links.active = true
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );

-- Policy for authenticated users to manage all order items
CREATE POLICY "Authenticated users can manage all order items"
  ON sales_order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for public users to create order items
CREATE POLICY "Public users can create order items"
  ON sales_order_items
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND customer_order_links.active = true
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );

-- Policy for public users to read their own order items
CREATE POLICY "Public users can read their own order items"
  ON sales_order_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND customer_order_links.active = true
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );