/*
  # Create commission rates table

  1. New Tables
    - `commission_rates`
      - `id` (uuid, primary key)
      - `role` (text, must be 'seller')
      - `rate` (numeric, between 0 and 100)
      - `description` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references users)

  2. Security
    - Enable RLS on `commission_rates` table
    - Add policies for admin access
    - Add policies for read access by authenticated users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can insert commission rates" ON commission_rates;
  DROP POLICY IF EXISTS "Admins can read commission rates" ON commission_rates;
  DROP POLICY IF EXISTS "Admins can update commission rates" ON commission_rates;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create commission rates table if it doesn't exist
CREATE TABLE IF NOT EXISTS commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role = 'seller'),
  rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 100),
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can insert commission rates"
  ON commission_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can read commission rates"
  ON commission_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update commission rates"
  ON commission_rates
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_commission_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_commission_rates_updated_at ON commission_rates;

-- Create trigger to update updated_at
CREATE TRIGGER update_commission_rates_updated_at
  BEFORE UPDATE ON commission_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_rates_updated_at();

-- Insert default commission rate if not exists
INSERT INTO commission_rates (role, rate, description)
SELECT 'seller', 5, 'Default commission rate for sellers'
WHERE NOT EXISTS (
  SELECT 1 FROM commission_rates WHERE role = 'seller'
);