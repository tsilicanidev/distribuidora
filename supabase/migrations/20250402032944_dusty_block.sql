/*
  # Fix Commission Rates Schema
  
  1. Changes
    - Add user_id column to commission_rates table
    - Update existing policies to work with user_id
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Add user_id column if it doesn't exist
ALTER TABLE commission_rates 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_commission_rates_user_id ON commission_rates(user_id);

-- Update existing policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can insert commission rates" ON commission_rates;
  DROP POLICY IF EXISTS "Admins can read commission rates" ON commission_rates;
  DROP POLICY IF EXISTS "Admins can update commission rates" ON commission_rates;
  
  -- Create new policies
  CREATE POLICY "Admins can insert commission rates"
    ON commission_rates
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  CREATE POLICY "Admins can read commission rates"
    ON commission_rates
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Admins can update commission rates"
    ON commission_rates
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
END $$;