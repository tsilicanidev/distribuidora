/*
  # Fix Sales Order Items RLS Policies

  1. Changes
    - Update RLS policies for sales_order_items table to allow:
      - Authenticated users to manage items for their orders
      - Public users to create items via customer order links

  2. Security
    - Enable RLS on sales_order_items table
    - Add appropriate policies for different user roles
    - Ensure data access is properly restricted
*/

-- Enable RLS
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Managers and admins can manage all order items" ON sales_order_items;
DROP POLICY IF EXISTS "Sellers can manage own order items" ON sales_order_items;
DROP POLICY IF EXISTS "Public can create order items" ON sales_order_items;

-- Create new policies
CREATE POLICY "Managers and admins can manage all order items"
ON sales_order_items
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

CREATE POLICY "Sellers can manage own order items"
ON sales_order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales_orders
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND sales_orders.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales_orders
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND sales_orders.seller_id = auth.uid()
  )
);

-- Allow public to create order items (for customer order links)
CREATE POLICY "Public can create order items"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales_orders
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  )
);

-- Allow public to read their own order items
CREATE POLICY "Public can read own order items"
ON sales_order_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM sales_orders
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  )
);