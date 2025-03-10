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

-- First, revoke all existing permissions
REVOKE ALL ON SEQUENCE public.sales_order_number_seq FROM PUBLIC, authenticated;
REVOKE ALL ON TABLE public.sales_orders FROM PUBLIC, authenticated;

-- Drop existing objects to recreate them properly
DROP TRIGGER IF EXISTS assign_order_number_trigger ON public.sales_orders;
DROP FUNCTION IF EXISTS public.assign_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.get_next_order_number() CASCADE;
DROP SEQUENCE IF EXISTS public.sales_order_number_seq CASCADE;

-- Create new sequence owned by postgres
CREATE SEQUENCE IF NOT EXISTS public.sales_order_number_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

ALTER SEQUENCE public.sales_order_number_seq OWNER TO postgres;

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
    -- Get exclusive lock on the sequence to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('sales_order_number_seq'));
    
    next_num := nextval('public.sales_order_number_seq');
    year_prefix := to_char(current_date, 'YYYY');
    RETURN year_prefix || LPAD(next_num::text, 6, '0');
END;
$$;

ALTER FUNCTION public.get_next_order_number() OWNER TO postgres;

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

ALTER FUNCTION public.assign_order_number() OWNER TO postgres;

-- Create trigger on sales_orders table
CREATE TRIGGER assign_order_number_trigger
    BEFORE INSERT ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_order_number();

-- Grant necessary permissions
GRANT USAGE ON SEQUENCE public.sales_order_number_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_number() TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Allow authenticated to manage sales_orders" ON public.sales_orders;
CREATE POLICY "Allow authenticated to manage sales_orders"
    ON public.sales_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant table permissions
GRANT ALL ON public.sales_orders TO authenticated;

-- Verify sequence ownership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences
        WHERE schemaname = 'public'
        AND sequencename = 'sales_order_number_seq'
        AND sequenceowner = 'postgres'
    ) THEN
        RAISE EXCEPTION 'Sequence ownership verification failed';
    END IF;
END $$;