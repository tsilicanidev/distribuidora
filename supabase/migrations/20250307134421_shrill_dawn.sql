/*
  # Fix Order Policies and Error Logging

  1. Changes
    - Drop and recreate policies for sales_orders and sales_order_items
    - Update error logging policies
    - Fix permission issues for public access
    - Ensure proper validation of customer links

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and public users
    - Ensure proper validation of customer links
*/

-- Drop existing policies
DROP POLICY IF EXISTS "authenticated_users_orders_access" ON sales_orders;
DROP POLICY IF EXISTS "public_orders_insert" ON sales_orders;
DROP POLICY IF EXISTS "public_orders_select" ON sales_orders;
DROP POLICY IF EXISTS "authenticated_users_order_items_access" ON sales_order_items;
DROP POLICY IF EXISTS "public_order_items_insert" ON sales_order_items;
DROP POLICY IF EXISTS "public_order_items_select" ON sales_order_items;

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for sales_orders
CREATE POLICY "authenticated_users_orders_access" ON sales_orders
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_orders_insert" ON sales_orders
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

CREATE POLICY "public_orders_select" ON sales_orders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM customer_order_links
      WHERE customer_order_links.customer_id = sales_orders.customer_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

-- Create policies for sales_order_items
CREATE POLICY "authenticated_users_order_items_access" ON sales_order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_order_items_insert" ON sales_order_items
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

CREATE POLICY "public_order_items_select" ON sales_order_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

-- Drop existing error log policies to avoid conflicts
DROP POLICY IF EXISTS "Allow insert for all" ON error_logs;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON error_logs;

-- Create error logs table if not exists
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  message text NOT NULL,
  stack text,
  context text,
  user_id uuid REFERENCES auth.users(id),
  customer_id uuid REFERENCES customers(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create new policies for error_logs
CREATE POLICY "Allow insert for all" ON error_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow select for authenticated users" ON error_logs
  FOR SELECT
  TO authenticated
  USING (true);