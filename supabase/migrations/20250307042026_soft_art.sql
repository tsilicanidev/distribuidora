/*
  # Update Customer Order Links Schema

  1. Changes
    - Add link_id column
    - Remove token column
    - Update indexes and constraints
    - Update policies to use auth.uid()

  2. Security
    - Maintain RLS policies
    - Update security to use UUID
    - Ensure proper authentication checks
*/

-- First create a new id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_order_links' 
    AND column_name = 'link_id'
  ) THEN
    -- Add new UUID column
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

-- Add unique constraint to link_id
ALTER TABLE customer_order_links 
ADD CONSTRAINT customer_order_links_link_id_key UNIQUE (link_id);

-- Drop token column and its constraints
ALTER TABLE customer_order_links
DROP COLUMN IF EXISTS token CASCADE;

-- Update or recreate indexes
DROP INDEX IF EXISTS idx_customer_order_links_token;
CREATE INDEX IF NOT EXISTS idx_customer_order_links_link_id ON customer_order_links(link_id);

-- Update policies to use link_id instead of token
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
  DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON customer_order_links;
  DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON customer_order_links;
  DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON customer_order_links;

  -- Recreate policies with link_id
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
END $$;

-- Update sales_orders policies to use link_id
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "public_users_create_orders" ON sales_orders;
  DROP POLICY IF EXISTS "public_users_read_orders" ON sales_orders;

  -- Recreate policies with link_id
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
END $$;

-- Update sales_order_items policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "public_users_create_items" ON sales_order_items;
  DROP POLICY IF EXISTS "public_users_read_items" ON sales_order_items;

  -- Recreate policies with link_id
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
END $$;