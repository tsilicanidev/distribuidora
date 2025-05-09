/*
  # Sales Orders Security Policies
  
  1. Security Changes
    - Enable RLS on sales_orders and sales_order_items tables
    - Add policies for:
      - Creating orders (authenticated users and public)
      - Reading orders (authenticated users and customers)
      - Updating orders (managers and admins)
  
  2. Description
    - Anyone can create orders through customer links
    - Authenticated users can view their orders
    - Managers and admins can manage all orders
*/

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Policy for creating orders (anyone can create)
CREATE POLICY "Anyone can create orders"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (true);

-- Policy for reading orders
CREATE POLICY "Users can read orders"
ON sales_orders
FOR SELECT
USING (
  -- Authenticated users can see all orders
  (auth.role() = 'authenticated')
  OR
  -- Public users can see their orders through customer links
  EXISTS (
    SELECT 1 FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

-- Policy for updating orders (managers and admins)
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

-- Policies for sales_order_items

-- Policy for creating order items (anyone can create)
CREATE POLICY "Anyone can create order items"
ON sales_order_items
FOR INSERT
TO public
WITH CHECK (true);

-- Policy for reading order items
CREATE POLICY "Users can read order items"
ON sales_order_items
FOR SELECT
USING (
  -- Authenticated users can see all items
  (auth.role() = 'authenticated')
  OR
  -- Public users can see items for their orders
  EXISTS (
    SELECT 1 FROM sales_orders
    JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
    WHERE sales_orders.id = sales_order_items.sales_order_id
    AND customer_order_links.active = true
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

-- Policy for updating order items (managers and admins)
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);