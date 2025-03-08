/*
  # Create get_next_order_number function
  
  1. New Functions
    - `get_next_order_number`: Generates sequential order numbers
      - Returns a formatted order number with year and sequence (e.g. 2024000001)
      - Handles concurrent access safely
      - Auto-resets sequence each year
*/

-- Create sequence for order numbers if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'order_number_seq') THEN
    CREATE SEQUENCE public.order_number_seq;
  END IF;
END $$;

-- Create or replace the function to get next order number
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year text;
  next_number bigint;
  result text;
BEGIN
  -- Get current year
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Get next number from sequence
  SELECT nextval('public.order_number_seq') INTO next_number;
  
  -- Format result as YYYY + 6-digit sequence (e.g. 2024000001)
  result := current_year || LPAD(next_number::text, 6, '0');
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;

-- Reset sequence at the start of each year
CREATE OR REPLACE FUNCTION public.reset_order_number_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset sequence to 0
  ALTER SEQUENCE public.order_number_seq RESTART WITH 1;
END;
$$;

-- Create a trigger to reset sequence on new year
CREATE OR REPLACE FUNCTION public.check_year_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_order_year text;
  current_year text;
BEGIN
  -- Get year of last order
  SELECT SUBSTRING(number FROM 1 FOR 4)
  INTO last_order_year
  FROM sales_orders
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get current year
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- If year changed, reset sequence
  IF last_order_year IS NULL OR last_order_year != current_year THEN
    PERFORM reset_order_number_sequence();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check year change before each insert
DROP TRIGGER IF EXISTS check_year_change_trigger ON sales_orders;
CREATE TRIGGER check_year_change_trigger
  BEFORE INSERT ON sales_orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_year_change();