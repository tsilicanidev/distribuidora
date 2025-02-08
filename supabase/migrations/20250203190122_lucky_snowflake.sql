/*
  # Update customers table schema
  
  1. Changes
    - Add missing address fields
    - Ensure all required fields exist
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add missing fields if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'endereco'
  ) THEN
    ALTER TABLE customers ADD COLUMN endereco text;
  END IF;
END $$;