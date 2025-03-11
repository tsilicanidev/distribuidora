/*
  # Fix Sales Order RLS Policies

  1. Changes
    - Update RLS policies for sales_orders table to allow:
      - Authenticated users to create orders
      - Sellers to manage their own orders
      - Admins/Managers to manage all orders
      - Public users to create orders via customer order links

  2. Security
    - Enable RLS on sales_orders table
    - Add appropriate policies for different user roles
    - Ensure data access is properly restricted
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Managers and admins can manage all orders" ON sales_orders;
DROP POLICY IF EXISTS "Sellers can manage own orders" ON sales_orders;
DROP POLICY IF EXISTS "Public can create orders" ON sales_orders;

-- Create new policies
CREATE POLICY "Managers and admins can manage all orders"
ON sales_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'master')
  )
);

CREATE POLICY "Sellers can manage own orders"
ON sales_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
    AND sales_orders.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
    AND sales_orders.seller_id = auth.uid()
  )
);

-- Allow public to create orders (for customer order links)
CREATE POLICY "Public can create orders"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to read their own orders
CREATE POLICY "Public can read own orders"
ON sales_orders
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND customer_order_links.expires_at > now()
  )
);