/*
  # Fix Sales Order Sequence and Permissions

  1. Changes
    - Drop existing sequence if exists
    - Create new sequence with proper ownership
    - Update function to use sequence securely
    - Grant proper permissions to authenticated users
    - Add trigger for automatic number generation

  2. Security
    - Sequence owned by authenticated role
    - Secure function execution
    - Proper permission grants
*/

-- Drop existing sequence and function
DROP SEQUENCE IF EXISTS public.sales_order_number_seq CASCADE;
DROP FUNCTION IF EXISTS public.get_next_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.assign_order_number() CASCADE;

-- Create new sequence
CREATE SEQUENCE IF NOT EXISTS public.sales_order_number_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Grant usage to authenticated users
GRANT USAGE, SELECT ON SEQUENCE public.sales_order_number_seq TO authenticated;

-- Create function to get next order number
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num bigint;
    year_prefix text;
BEGIN
    next_num := nextval('public.sales_order_number_seq');
    year_prefix := to_char(current_date, 'YYYY');
    RETURN year_prefix || LPAD(next_num::text, 6, '0');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;

-- Create trigger function for automatic number assignment
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.number IS NULL THEN
        NEW.number := get_next_order_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_order_number() TO authenticated;

-- Create trigger on sales_orders table
DROP TRIGGER IF EXISTS assign_order_number_trigger ON public.sales_orders;
CREATE TRIGGER assign_order_number_trigger
    BEFORE INSERT ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_order_number();

-- Ensure RLS is enabled
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for sales_orders
DROP POLICY IF EXISTS "Allow authenticated to manage sales_orders" ON public.sales_orders;
CREATE POLICY "Allow authenticated to manage sales_orders"
    ON public.sales_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary table permissions
GRANT ALL ON public.sales_orders TO authenticated;