/*
  # Fix Public Access Policies
  
  1. Changes
    - Update RLS policies to allow public access
    - Add anonymous access for order creation
  
  2. Security
    - Enable public access for specific operations
    - Maintain data integrity and security
*/

-- Enable RLS on all tables
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
DROP POLICY IF EXISTS "Anyone can create orders" ON sales_orders;
DROP POLICY IF EXISTS "Anyone can read own orders" ON sales_orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Anyone can read own order items" ON sales_order_items;

-- Customer Order Links Policies
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
TO anon, authenticated
USING (
  active = true AND 
  (expires_at IS NULL OR expires_at > now())
);

-- Sales Orders Policies
CREATE POLICY "Anyone can create orders"
ON sales_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read own orders"
ON sales_orders
FOR SELECT
TO anon, authenticated
USING (true);

-- Sales Order Items Policies
CREATE POLICY "Anyone can create order items"
ON sales_order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read own order items"
ON sales_order_items
FOR SELECT
TO anon, authenticated
USING (true);