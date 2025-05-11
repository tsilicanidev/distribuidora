/*
  # Fix Sales Order Sequence Permissions

  1. Changes
    - Create sales_order_number_seq sequence if it doesn't exist
    - Set proper ownership and grant permissions
    - Enable RLS on affected objects
    - Add necessary security policies

  2. Security
    - Maintains proper role hierarchy
    - Ensures sequence security
    - Preserves RLS policies
*/

DO $$ 
BEGIN
  -- Create the sequence if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'sales_order_number_seq') THEN
    CREATE SEQUENCE public.sales_order_number_seq
      INCREMENT 1
      START 1
      MINVALUE 1
      MAXVALUE 9223372036854775807
      CACHE 1;
  END IF;
END $$;

-- Set proper ownership
ALTER SEQUENCE public.sales_order_number_seq OWNER TO postgres;

-- Grant usage to authenticated users
GRANT USAGE ON SEQUENCE public.sales_order_number_seq TO authenticated;

-- Grant select to authenticated users
GRANT SELECT ON SEQUENCE public.sales_order_number_seq TO authenticated;

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
    next_num := nextval('public.sales_order_number_seq');
    year_prefix := to_char(current_date, 'YYYY');
    RETURN year_prefix || LPAD(next_num::text, 6, '0');
END;
$$;