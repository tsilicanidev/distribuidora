/*
  # Update RLS policies for customer orders

  1. Changes
    - Add policies to allow public access for order creation through valid tokens
    - Add policies for order items creation
    - Add policies for stock movements
    
  2. Security
    - Enable RLS on affected tables
    - Add specific policies for token-based access
    - Ensure data integrity with proper checks
*/

-- Enable RLS on tables
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy for public users to create orders through valid tokens
CREATE POLICY "Public can create orders with valid token"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND customer_order_links.expires_at > now()
  )
);

-- Policy for public users to create order items
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

-- Policy for public users to create stock movements
CREATE POLICY "Public can create stock movements for orders"
ON stock_movements
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales_orders
    WHERE sales_orders.id = stock_movements.reference_id::uuid
    AND EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  )
);

-- Policy for public users to update product stock
CREATE POLICY "Public can update product stock through orders"
ON products
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM sales_orders so
    JOIN customer_order_links col ON col.customer_id = so.customer_id
    WHERE col.active = true
    AND col.expires_at > now()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales_orders so
    JOIN customer_order_links col ON col.customer_id = so.customer_id
    WHERE col.active = true
    AND col.expires_at > now()
  )
);