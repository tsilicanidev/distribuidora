/*
  # Recreate Sales Orders Table

  1. Changes
    - Drop and recreate sales_orders table with proper structure
    - Create sequence for order numbers
    - Set up RLS policies
    - Add necessary indexes
    - Create triggers for order number generation

  2. Security
    - Enable RLS
    - Add policies for different user roles
    - Set up proper permissions
*/

-- Drop existing objects
DROP TABLE IF EXISTS sales_order_items CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP SEQUENCE IF EXISTS sales_order_number_seq;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Grant usage on sequence to authenticated users
GRANT USAGE, SELECT ON SEQUENCE sales_order_number_seq TO authenticated;

-- Create sales_orders table
CREATE TABLE sales_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number text UNIQUE NOT NULL,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    commission_amount numeric NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create sales_order_items table
CREATE TABLE sales_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric NOT NULL CHECK (unit_price >= 0),
    total_price numeric NOT NULL CHECK (total_price >= 0),
    created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_seller ON sales_orders(seller_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_created ON sales_orders(created_at);
CREATE INDEX idx_sales_orders_number ON sales_orders(number);

CREATE INDEX idx_sales_order_items_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Function to generate order number
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

-- Trigger function for order number assignment
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

-- Create trigger
CREATE TRIGGER assign_order_number_trigger
    BEFORE INSERT ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_order_number();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for sales_orders
CREATE POLICY "Sellers can manage own orders"
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

CREATE POLICY "Managers and admins can manage all orders"
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

-- RLS Policies for sales_order_items
CREATE POLICY "Sellers can manage own order items"
    ON sales_order_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sales_orders
            WHERE sales_orders.id = sales_order_items.sales_order_id
            AND sales_orders.seller_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales_orders
            WHERE sales_orders.id = sales_order_items.sales_order_id
            AND sales_orders.seller_id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can manage all order items"
    ON sales_order_items
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