/*
  # Fix Customer Orders Schema and Permissions

  1. Changes
    - Add token column to customer_order_links
    - Update RLS policies for customer orders
    - Fix permissions for public access

  2. Security
    - Enable RLS on all tables
    - Add proper policies for customer access
    - Grant necessary permissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON customer_order_links;

DROP POLICY IF EXISTS "Allow authenticated users full access to orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to create orders with valid link" ON sales_orders;
DROP POLICY IF EXISTS "Allow public users to read their orders" ON sales_orders;

DROP POLICY IF EXISTS "Allow authenticated users full access to order items" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public users to create order items with valid link" ON sales_order_items;
DROP POLICY IF EXISTS "Allow public users to read their order items" ON sales_order_items;

-- Add token column if it doesn't exist
ALTER TABLE customer_order_links 
ADD COLUMN IF NOT EXISTS token text;

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_order_links
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
TO anon, authenticated
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
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

-- Create policies for sales_orders
CREATE POLICY "Allow authenticated users full access to orders"
ON sales_orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public users to create orders with valid link"
ON sales_orders
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

CREATE POLICY "Allow public users to read their orders"
ON sales_orders
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM customer_order_links
    WHERE customer_order_links.customer_id = sales_orders.customer_id
    AND customer_order_links.active = true
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

-- Create policies for sales_order_items
CREATE POLICY "Allow authenticated users full access to order items"
ON sales_order_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public users to create order items with valid link"
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
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

CREATE POLICY "Allow public users to read their order items"
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
    AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON customer_order_links TO anon;
GRANT SELECT, INSERT ON sales_orders TO anon;
GRANT SELECT, INSERT ON sales_order_items TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_order_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_order_links_updated_at ON customer_order_links;
CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_links_updated_at();