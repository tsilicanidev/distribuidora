/*
  # Update Customer Orders Security Policies
  
  1. Changes
    - Drop existing policies before recreating them
    - Create new policies for customer order links
    - Update sales orders policies
    - Update sales order items policies
  
  2. Security
    - Enable RLS on all tables
    - Add proper policies for public and authenticated access
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Anyone can create orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can read orders" ON sales_orders;
DROP POLICY IF EXISTS "Managers and admins can update orders" ON sales_orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Users can read order items" ON sales_order_items;
DROP POLICY IF EXISTS "Managers and admins can update order items" ON sales_order_items;

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Customer Order Links Policies
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
TO public
USING (
  (active = true AND (expires_at IS NULL OR expires_at > now()))
  OR (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  )
);

CREATE POLICY "Managers and admins can create customer order links"
ON customer_order_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

CREATE POLICY "Managers and admins can update customer order links"
ON customer_order_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

CREATE POLICY "Managers and admins can delete customer order links"
ON customer_order_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

-- Sales Orders Policies
CREATE POLICY "Anyone can create orders"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can read orders"
ON sales_orders
FOR SELECT
TO public
USING (true);

CREATE POLICY "Managers and admins can update orders"
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
CREATE POLICY "Anyone can create order items"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can read order items"
ON sales_order_items
FOR SELECT
TO public
USING (true);

CREATE POLICY "Managers and admins can update order items"
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