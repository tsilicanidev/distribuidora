/*
  # Configure CORS and Helper Functions
  
  1. Changes
    - Create CORS configuration table
    - Add allowed origins
    - Create helper functions for order numbers and UUIDs
  
  2. Security
    - Enable RLS on CORS table
    - Add policies for CORS access
*/

-- Create CORS table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.cors IS 'Table for managing CORS allowed origins';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cors_origin ON public.cors(origin);

-- Enable RLS
ALTER TABLE public.cors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read CORS settings" ON public.cors;
DROP POLICY IF EXISTS "Allow admins to manage CORS settings" ON public.cors;

-- Add RLS policies
CREATE POLICY "Allow authenticated users to read CORS settings" ON public.cors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to manage CORS settings" ON public.cors
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Insert allowed origins
INSERT INTO public.cors (origin)
VALUES 
  ('http://localhost:5173'),
  ('http://localhost:4173'),
  ('https://jpdistribuidora.vercel.app')
ON CONFLICT (origin) DO NOTHING;

-- Create function to get next order number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year text;
  next_number integer;
  result text;
BEGIN
  -- Get current year
  current_year := to_char(current_date, 'YY');
  
  -- Get next number for current year
  SELECT COALESCE(MAX(SUBSTRING(number FROM '\d+')::integer), 0) + 1
  INTO next_number
  FROM sales_orders
  WHERE number LIKE current_year || '-%';
  
  -- Format result as YY-NNNNNN
  result := current_year || '-' || LPAD(next_number::text, 6, '0');
  
  RETURN result;
END;
$$;

-- Create function to get next delivery note number
CREATE OR REPLACE FUNCTION get_next_delivery_note_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year text;
  next_number integer;
  result text;
BEGIN
  -- Get current year
  current_year := to_char(current_date, 'YY');
  
  -- Get next number for current year
  SELECT COALESCE(MAX(SUBSTRING(number FROM '\d+')::integer), 0) + 1
  INTO next_number
  FROM delivery_notes
  WHERE number LIKE 'R' || current_year || '-%';
  
  -- Format result as RYY-NNNNNN
  result := 'R' || current_year || '-' || LPAD(next_number::text, 6, '0');
  
  RETURN result;
END;
$$;

-- Drop existing UUID function if it exists
DROP FUNCTION IF EXISTS generate_uuid();

-- Create function to generate UUID
CREATE FUNCTION generate_uuid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT gen_random_uuid();
$$;

-- Add comments
COMMENT ON FUNCTION get_next_order_number() IS 'Generates sequential order numbers by year';
COMMENT ON FUNCTION get_next_delivery_note_number() IS 'Generates sequential delivery note numbers by year';
COMMENT ON FUNCTION generate_uuid() IS 'Generates a random UUID';