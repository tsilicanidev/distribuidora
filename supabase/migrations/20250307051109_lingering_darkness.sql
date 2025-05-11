/*
  # Update Sales Order Policies

  1. Changes
    - Enable RLS on sales_orders and sales_order_items tables
    - Drop and recreate policies for public access
    - Add policies for order creation through customer links
    - Grant necessary permissions to public role

  2. Security
    - Allow public users to create orders through valid customer links
    - Allow public users to read their own orders
    - Allow public users to create and read order items for their orders
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop sales_orders policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_users_create_orders' AND tablename = 'sales_orders') THEN
    DROP POLICY "public_users_create_orders" ON sales_orders;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_users_read_orders' AND tablename = 'sales_orders') THEN
    DROP POLICY "public_users_read_orders" ON sales_orders;
  END IF;

  -- Drop sales_order_items policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_users_create_items' AND tablename = 'sales_order_items') THEN
    DROP POLICY "public_users_create_items" ON sales_order_items;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_users_read_items' AND tablename = 'sales_order_items') THEN
    DROP POLICY "public_users_read_items" ON sales_order_items;
  END IF;
END $$;

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

-- Grant necessary permissions to public role
GRANT INSERT ON sales_orders TO public;
GRANT INSERT ON sales_order_items TO public;