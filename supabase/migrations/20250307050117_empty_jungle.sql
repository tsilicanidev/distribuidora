/*
  # Update policies for anonymous order creation
  
  1. Changes
    - Replace token with link_id in customer_order_links
    - Update policies to allow anonymous access for order creation
    - Add policies for sales_orders and sales_order_items
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and anonymous users
    - Restrict anonymous access to only order creation through valid links
*/

-- First drop all existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop policies from sales_orders
  DROP POLICY IF EXISTS "authenticated_users_manage_orders" ON sales_orders;
  DROP POLICY IF EXISTS "public_users_create_orders" ON sales_orders;
  DROP POLICY IF EXISTS "public_users_read_orders" ON sales_orders;
  
  -- Drop policies from sales_order_items
  DROP POLICY IF EXISTS "authenticated_users_manage_items" ON sales_order_items;
  DROP POLICY IF EXISTS "public_users_create_items" ON sales_order_items;
  DROP POLICY IF EXISTS "public_users_read_items" ON sales_order_items;
  
  -- Drop policies from customer_order_links
  DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
  DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON customer_order_links;
  DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON customer_order_links;
  DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON customer_order_links;
END $$;

-- Add link_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_order_links' 
    AND column_name = 'link_id'
  ) THEN
    ALTER TABLE customer_order_links 
    ADD COLUMN link_id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Make sure all existing rows have a link_id
UPDATE customer_order_links 
SET link_id = gen_random_uuid() 
WHERE link_id IS NULL;

-- Make link_id not nullable
ALTER TABLE customer_order_links 
ALTER COLUMN link_id SET NOT NULL;

-- Add unique constraint to link_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_order_links_link_id_key'
  ) THEN
    ALTER TABLE customer_order_links 
    ADD CONSTRAINT customer_order_links_link_id_key UNIQUE (link_id);
  END IF;
END $$;

-- Drop token column and its constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_order_links' 
    AND column_name = 'token'
  ) THEN
    ALTER TABLE customer_order_links
    DROP COLUMN token CASCADE;
  END IF;
END $$;

-- Update or recreate indexes
DROP INDEX IF EXISTS idx_customer_order_links_token;
CREATE INDEX IF NOT EXISTS idx_customer_order_links_link_id ON customer_order_links(link_id);

-- Enable RLS on all tables if not already enabled
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create new policies for customer_order_links
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

-- Create policies for sales_orders
CREATE POLICY "authenticated_users_manage_orders"
  ON sales_orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_users_create_orders"
  ON sales_orders
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
      AND customer_order_links.active = true
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );

CREATE POLICY "public_users_read_orders"
  ON sales_orders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 
      FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
      AND customer_order_links.active = true
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );

-- Create policies for sales_order_items
CREATE POLICY "authenticated_users_manage_items"
  ON sales_order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_users_create_items"
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
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );

CREATE POLICY "public_users_read_items"
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
      AND (
        customer_order_links.expires_at IS NULL 
        OR customer_order_links.expires_at > now()
      )
    )
  );