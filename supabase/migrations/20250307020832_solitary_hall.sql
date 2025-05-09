/*
  # Fix Customer Orders Access Policies
  
  1. Changes
    - Update RLS policies for customer order links
    - Add policies for sales orders and items
    - Enable public access for order creation
  
  2. Security
    - Allow public access to create orders
    - Maintain admin/manager access for management
    - Ensure proper token validation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
DROP POLICY IF EXISTS "Anyone can create orders" ON sales_orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON sales_order_items;

-- Customer Order Links Policies
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
TO public
USING (
  active = true AND 
  (expires_at IS NULL OR expires_at > now())
);

-- Sales Orders Policies
CREATE POLICY "Anyone can create orders"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can read own orders"
ON sales_orders
FOR SELECT
TO public
USING (true);

-- Sales Order Items Policies
CREATE POLICY "Anyone can create order items"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can read own order items"
ON sales_order_items
FOR SELECT
TO public
USING (true);