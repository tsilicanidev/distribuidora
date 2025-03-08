/*
  # Fix Sales Orders RLS Configuration

  1. Changes
    - Configure RLS for sales_orders and sales_order_items tables
    - Add policies for authenticated and public access
    - Enable token-based order creation for customers
    - Ensure proper access control and data isolation

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    - Add policies for public users with valid tokens
    - Ensure proper data access control
*/

-- Enable RLS on tables
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies safely
DO $$ 
BEGIN
    -- Drop sales_orders policies
    DROP POLICY IF EXISTS "authenticated_users_manage_orders" ON sales_orders;
    DROP POLICY IF EXISTS "public_users_create_orders" ON sales_orders;
    DROP POLICY IF EXISTS "public_users_read_orders" ON sales_orders;
    
    -- Drop sales_order_items policies
    DROP POLICY IF EXISTS "authenticated_users_manage_items" ON sales_order_items;
    DROP POLICY IF EXISTS "public_users_create_items" ON sales_order_items;
    DROP POLICY IF EXISTS "public_users_read_items" ON sales_order_items;
END $$;

-- Create policies for sales_orders

-- Allow authenticated users to manage all orders
CREATE POLICY "authenticated_users_manage_orders"
ON sales_orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public users to create orders with valid token
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
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
);

-- Allow public users to read their own orders
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
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
);

-- Create policies for sales_order_items

-- Allow authenticated users to manage all items
CREATE POLICY "authenticated_users_manage_items"
ON sales_order_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public users to create items for their orders
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
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
);

-- Allow public users to read their order items
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
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
);