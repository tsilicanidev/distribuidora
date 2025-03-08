/*
  # Update Sales Order Policies for Public Access

  1. Changes
    - Drop and recreate policies for sales_orders and sales_order_items
    - Enable RLS on all related tables
    - Add policies for public access through customer links

  2. Security
    - Allow public users to create orders through customer links
    - Allow public users to read their own orders
    - Allow public users to create order items for their orders
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "public_users_create_orders" ON sales_orders;
DROP POLICY IF EXISTS "public_users_read_orders" ON sales_orders;
DROP POLICY IF EXISTS "public_users_create_items" ON sales_order_items;
DROP POLICY IF EXISTS "public_users_read_items" ON sales_order_items;

-- Create policies for sales_orders
CREATE POLICY "public_users_create_orders"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);

CREATE POLICY "public_users_read_orders"
ON sales_orders
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);

-- Create policies for sales_order_items
CREATE POLICY "public_users_create_items"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM sales_orders
    JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);

CREATE POLICY "public_users_read_items"
ON sales_order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM sales_orders
    JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);