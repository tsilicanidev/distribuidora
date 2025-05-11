/*
  # Add UUID Generation Function
  
  1. New Functions
    - `generate_uuid`: Function to generate UUIDs for tokens
  
  2. Security
    - Function is accessible to authenticated users only
*/

-- Create function to generate UUIDs
CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '')
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_uuid TO authenticated;