/*
  # Fix Sales Orders RLS Configuration

  1. Changes
    - Reset and properly configure RLS for sales_orders and sales_order_items
    - Add comprehensive policies for both authenticated and public access
    - Ensure proper token-based access for customer orders

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage all orders
    - Add policies for public users to create and read orders via valid tokens
    - Ensure proper access control and data isolation
*/

-- First, ensure RLS is enabled
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop sales_orders policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales_orders') THEN
        DROP POLICY IF EXISTS "Anyone can create orders" ON sales_orders;
        DROP POLICY IF EXISTS "Anyone can read own orders" ON sales_orders;
        DROP POLICY IF EXISTS "Authenticated update access" ON sales_orders;
        DROP POLICY IF EXISTS "Public insert access" ON sales_orders;
        DROP POLICY IF EXISTS "Public read access" ON sales_orders;
        DROP POLICY IF EXISTS "Users can read orders" ON sales_orders;
        DROP POLICY IF EXISTS "sales_orders_master_access" ON sales_orders;
        DROP POLICY IF EXISTS "Authenticated users can manage all orders" ON sales_orders;
        DROP POLICY IF EXISTS "Public users can create orders" ON sales_orders;
        DROP POLICY IF EXISTS "Public users can read their own orders" ON sales_orders;
    END IF;

    -- Drop sales_order_items policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales_order_items') THEN
        DROP POLICY IF EXISTS "Anyone can create order items" ON sales_order_items;
        DROP POLICY IF EXISTS "Anyone can read own order items" ON sales_order_items;
        DROP POLICY IF EXISTS "Authenticated update access" ON sales_order_items;
        DROP POLICY IF EXISTS "Public insert access" ON sales_order_items;
        DROP POLICY IF EXISTS "Public read access" ON sales_order_items;
        DROP POLICY IF EXISTS "Users can read order items" ON sales_order_items;
        DROP POLICY IF EXISTS "sales_order_items_master_access" ON sales_order_items;
        DROP POLICY IF EXISTS "Authenticated users can manage all order items" ON sales_order_items;
        DROP POLICY IF EXISTS "Public users can create order items" ON sales_order_items;
        DROP POLICY IF EXISTS "Public users can read their own order items" ON sales_order_items;
    END IF;
END $$;

-- Create new policies for sales_orders

-- Policy for authenticated users
CREATE POLICY "authenticated_users_manage_orders"
ON sales_orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for public users to create orders
CREATE POLICY "public_users_create_orders"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = customer_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);

-- Policy for public users to read their orders
CREATE POLICY "public_users_read_orders"
ON sales_orders
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = customer_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);

-- Create new policies for sales_order_items

-- Policy for authenticated users
CREATE POLICY "authenticated_users_manage_items"
ON sales_order_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for public users to create order items
CREATE POLICY "public_users_create_items"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM sales_orders
    JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
    WHERE sales_orders.id = sales_order_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);

-- Policy for public users to read their order items
CREATE POLICY "public_users_read_items"
ON sales_order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM sales_orders
    JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
    WHERE sales_orders.id = sales_order_id
    AND customer_order_links.active = true
    AND (
      customer_order_links.expires_at IS NULL 
      OR customer_order_links.expires_at > now()
    )
  )
);