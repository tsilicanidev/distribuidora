/*
  # Update RLS policies for customer orders

  1. Changes
    - Enable RLS on tables if not already enabled
    - Add policies for public access through valid tokens
    - Add policies for stock movements and product updates
    
  2. Security
    - Ensure proper RLS is enabled
    - Add token-based access policies
    - Maintain data integrity with proper checks
*/

-- Enable RLS on tables if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'sales_orders' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'sales_order_items' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'stock_movements' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public can create orders with valid token" ON sales_orders;
  DROP POLICY IF EXISTS "Public can create stock movements for orders" ON stock_movements;
  DROP POLICY IF EXISTS "Public can update product stock through orders" ON products;
END $$;

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

-- Add read policies for public access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public can read products'
    AND tablename = 'products'
  ) THEN
    CREATE POLICY "Public can read products"
    ON products
    FOR SELECT
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public can read own orders'
    AND tablename = 'sales_orders'
  ) THEN
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
  END IF;
END $$;