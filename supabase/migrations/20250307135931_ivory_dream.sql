/*
  # Fix Order Permissions

  1. Changes
    - Drop and recreate all order-related policies
    - Add proper public access for customer portal
    - Fix permission issues for order creation
    - Ensure proper validation of customer links

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and public users
    - Ensure proper validation of customer links
*/

-- Drop all existing policies
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
  TO anon, public
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
  TO anon, public
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
  TO anon, public
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
  TO anon, public
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      JOIN customer_order_links ON customer_order_links.customer_id = sales_orders.customer_id
      WHERE sales_orders.id = sales_order_items.sales_order_id
        AND customer_order_links.active = true
        AND (customer_order_links.expires_at IS NULL OR customer_order_links.expires_at > now())
    )
  );

-- Create function to generate order number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  year_prefix text;
BEGIN
  -- Get current year as 2-digit string
  year_prefix := to_char(CURRENT_DATE, 'YY');
  
  -- Get max order number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 3) AS integer)), 0)
  INTO next_number
  FROM sales_orders
  WHERE number LIKE year_prefix || '%';
  
  -- Increment and format with leading zeros
  next_number := next_number + 1;
  
  -- Return formatted order number (YY + 6 digits)
  RETURN year_prefix || LPAD(next_number::text, 6, '0');
END;
$$;