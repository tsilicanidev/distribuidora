/*
  # Fix Customer Orders Permissions

  1. Changes
    - Update RLS policies for sales_orders and sales_order_items
    - Add proper permissions for public access via customer links
    - Fix token validation and order creation

  2. Security
    - Enable RLS on both tables
    - Allow public access for customers with valid links
    - Maintain existing authenticated user access
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
CREATE POLICY "Allow authenticated users full access to orders"
ON sales_orders
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public users to create orders with valid link"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
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
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

-- Create policies for sales_order_items
CREATE POLICY "Allow authenticated users full access to order items"
ON sales_order_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public users to create order items with valid link"
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
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

CREATE POLICY "Allow public users to read their order items"
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
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

-- Grant necessary permissions to public role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON customer_order_links TO anon;
GRANT SELECT, INSERT ON sales_orders TO anon;
GRANT SELECT, INSERT ON sales_order_items TO anon;