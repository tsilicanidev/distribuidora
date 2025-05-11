/*
  # Update Sales Order Policies

  1. Changes
    - Drop existing policies
    - Create new policies for public and authenticated users
    - Enable RLS on all related tables
    - Add policies for sales_order_items table

  2. Security
    - Allow public users to create orders through customer links
    - Allow authenticated users full access
    - Ensure proper access control for order items
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "authenticated_users_manage_orders" ON sales_orders;
DROP POLICY IF EXISTS "public_users_create_orders" ON sales_orders;
DROP POLICY IF EXISTS "public_users_read_orders" ON sales_orders;
DROP POLICY IF EXISTS "authenticated_users_manage_items" ON sales_order_items;
DROP POLICY IF EXISTS "public_users_create_items" ON sales_order_items;
DROP POLICY IF EXISTS "public_users_read_items" ON sales_order_items;

-- Create policies for sales_orders
CREATE POLICY "authenticated_users_manage_orders"
ON sales_orders
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

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
CREATE POLICY "authenticated_users_manage_items"
ON sales_order_items
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

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