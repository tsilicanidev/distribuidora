/*
  # Create order number sequence and functions

  1. New Objects
    - Sequence for order numbers
    - Function to get next order number
    - Function to handle year change
    - Function to assign order numbers
  
  2. Changes
    - Add automatic order number generation
    - Add year change handling
    - Add order number assignment
*/

-- Create sequence for order numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq;

-- Function to get next order number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  year_prefix text;
BEGIN
  next_number := nextval('sales_order_number_seq');
  year_prefix := to_char(current_date, 'YYYY');
  RETURN year_prefix || LPAD(next_number::text, 6, '0');
END;
$$;

-- Function to handle year change
CREATE OR REPLACE FUNCTION check_year_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  last_order_year text;
BEGIN
  -- Get current year
  current_year := to_char(current_date, 'YYYY');
  
  -- Get year from last order number
  SELECT SUBSTRING(number FROM 1 FOR 4)
  INTO last_order_year
  FROM sales_orders
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If year changed or no orders exist, reset sequence
  IF last_order_year IS NULL OR last_order_year != current_year THEN
    ALTER SEQUENCE sales_order_number_seq RESTART WITH 1;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to auto-assign order numbers
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number := get_next_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS check_year_change_trigger ON sales_orders;
DROP TRIGGER IF EXISTS assign_order_number_trigger ON sales_orders;

-- Create triggers
CREATE TRIGGER check_year_change_trigger
  BEFORE INSERT ON sales_orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_year_change();

CREATE TRIGGER assign_order_number_trigger
  BEFORE INSERT ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_order_number();