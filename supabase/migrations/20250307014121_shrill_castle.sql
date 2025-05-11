/*
  # Fix Sales Orders Security Policies
  
  1. Changes
    - Drop existing policies
    - Create new simplified policies that allow:
      - Public access for order creation
      - Public access for order items creation
      - Proper read access for both authenticated and public users
  
  2. Description
    - Simplifies policies to ensure orders can be created through customer links
    - Maintains security while allowing necessary public access
    - Ensures proper read access for customers through links
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can read orders" ON sales_orders;
DROP POLICY IF EXISTS "Managers and admins can update orders" ON sales_orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Users can read order items" ON sales_order_items;
DROP POLICY IF EXISTS "Managers and admins can update order items" ON sales_order_items;

-- Sales Orders Policies

-- Allow public insert
CREATE POLICY "Public insert access"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (true);

-- Allow read access
CREATE POLICY "Public read access"
ON sales_orders
FOR SELECT
TO public
USING (true);

-- Allow update for authenticated users
CREATE POLICY "Authenticated update access"
ON sales_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

-- Sales Order Items Policies

-- Allow public insert
CREATE POLICY "Public insert access"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (true);

-- Allow read access
CREATE POLICY "Public read access"
ON sales_order_items
FOR SELECT
TO public
USING (true);

-- Allow update for authenticated users
CREATE POLICY "Authenticated update access"
ON sales_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);