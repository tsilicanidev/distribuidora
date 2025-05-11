/*
  # Fix Sales Order Sequence and Permissions

  1. Changes
    - Create new sequence for sales order numbers with proper permissions
    - Grant usage permissions to authenticated users
    - Update sales order trigger to use new sequence
    - Add proper RLS policies for sales orders

  2. Security
    - Enable RLS on sales_orders table
    - Add policies for different user roles
*/

-- Drop existing sequence if it exists
DROP SEQUENCE IF EXISTS sales_order_number_seq;

-- Create new sequence
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Grant usage on sequence to authenticated users
GRANT USAGE, SELECT ON SEQUENCE sales_order_number_seq TO authenticated;

-- Update or create function to generate order number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number bigint;
    year_prefix text;
BEGIN
    next_number := nextval('sales_order_number_seq');
    year_prefix := to_char(current_date, 'YYYY');
    RETURN year_prefix || LPAD(next_number::text, 6, '0');
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION get_next_order_number() TO authenticated;

-- Enable RLS on sales_orders if not already enabled
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow sellers to manage own orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow managers to manage all orders" ON sales_orders;

-- Create policies for different roles
CREATE POLICY "Allow sellers to manage own orders"
    ON sales_orders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'seller'
            AND sales_orders.seller_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'seller'
            AND sales_orders.seller_id = auth.uid()
        )
    );

CREATE POLICY "Allow managers to manage all orders"
    ON sales_orders
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

-- Update trigger function for order number assignment
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.number IS NULL THEN
        NEW.number := get_next_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;