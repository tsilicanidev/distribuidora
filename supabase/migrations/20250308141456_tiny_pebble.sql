/*
  # Fix Sales Order Sequence and Function Permissions

  1. Changes
    - Create sales order number sequence
    - Create function to generate order numbers
    - Set proper ownership and permissions
    - Enable RLS policies

  2. Security
    - Function runs with definer security
    - Proper permission grants
    - Sequence owned by postgres role
*/

-- Create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS public.sales_order_number_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

-- Set sequence ownership to postgres
ALTER SEQUENCE public.sales_order_number_seq OWNER TO postgres;

-- Create function to generate next order number
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
    
    -- Get current year as prefix
    year_prefix := to_char(current_date, 'YYYY');
    
    -- Return formatted order number
    RETURN year_prefix || LPAD(next_num::text, 6, '0');
END;
$$;

-- Set function ownership to postgres
ALTER FUNCTION public.get_next_order_number() OWNER TO postgres;

-- Grant execute permission on function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;

-- Create policy to allow authenticated users to use the function
CREATE POLICY use_get_next_order_number ON public.sales_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable RLS on sales_orders table if not already enabled
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;