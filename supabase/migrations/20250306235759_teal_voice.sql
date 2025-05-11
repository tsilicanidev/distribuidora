/*
  # Create Next Order Number Function
  
  1. New Functions
    - `get_next_order_number`: Generates sequential order numbers with year prefix
  
  2. Description
    - Creates a function to generate sequential order numbers
    - Format: YYYY + 6-digit sequence (e.g., 2024000001)
    - Handles year transitions automatically
    - Thread-safe using advisory locks
*/

-- Create function to get next order number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  next_sequence integer;
  lock_key bigint;
  result text;
BEGIN
  -- Get current year
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Create a unique lock key for this operation
  lock_key := ('x' || substr(md5(current_year), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Get the highest sequence number for the current year
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN number ~ '^[0-9]{10}$' AND substr(number, 1, 4) = current_year 
        THEN CAST(substr(number, 5) AS integer)
        ELSE 0
      END
    ),
    0
  ) + 1
  INTO next_sequence
  FROM sales_orders
  WHERE substr(number, 1, 4) = current_year;
  
  -- Format the result: YYYY + 6-digit sequence
  result := current_year || LPAD(next_sequence::text, 6, '0');
  
  RETURN result;
END;
$$;