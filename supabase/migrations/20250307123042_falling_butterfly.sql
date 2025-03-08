/*
  # Fix Order Creation Policies

  1. Changes
    - Update RLS policies for sales_orders and sales_order_items
    - Add public access for order creation
    - Fix token-based access

  2. Security
    - Enable RLS
    - Add policies for public order creation
    - Maintain existing policies for authenticated users
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public users to create orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to read their orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public users to read their order items" ON sales_order_items;

-- Create policies for public order creation
CREATE POLICY "Allow public users to create orders"
ON sales_orders
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

CREATE POLICY "Allow public users to read their orders"
ON sales_orders
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

CREATE POLICY "Allow public users to create order items"
ON sales_order_items
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

CREATE POLICY "Allow public users to read their order items"
ON sales_order_items
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