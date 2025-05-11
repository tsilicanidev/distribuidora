/*
  # Fix Sales Order Sequence and Permissions

  1. Changes
    - Create sequence for order numbers
    - Set up automatic number generation
    - Configure proper permissions
    - Enable RLS and policies

  2. Security
    - Secure function execution
    - Proper permission grants
    - RLS enabled
*/

BEGIN;

-- Create sequence if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'sales_order_number_seq') THEN
    CREATE SEQUENCE public.sales_order_number_seq
      INCREMENT 1
      START 1
      MINVALUE 1
      MAXVALUE 9223372036854775807
      CACHE 1;
  END IF;
END $$;

-- Create or replace the function to get next order number
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
    -- Get next value from sequence
    next_num := nextval('public.sales_order_number_seq');
    year_prefix := to_char(current_date, 'YYYY');
    RETURN year_prefix || LPAD(next_num::text, 6, '0');
END;
$$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.number IS NULL THEN
        NEW.number := public.get_next_order_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS assign_order_number_trigger ON public.sales_orders;
CREATE TRIGGER assign_order_number_trigger
    BEFORE INSERT ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_order_number();

-- Enable RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Update policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated to manage sales_orders" ON public.sales_orders;
    
    CREATE POLICY "Allow authenticated to manage sales_orders"
        ON public.sales_orders
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Grant permissions
GRANT USAGE ON SEQUENCE public.sales_order_number_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.sales_order_number_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_number() TO authenticated;
GRANT ALL ON public.sales_orders TO authenticated;

COMMIT;