/*
  # Fix Commission Rates Table

  1. Changes
    - Drop and recreate commission_rates table with proper structure
    - Add proper RLS policies
    - Insert default commission rate
    - Add necessary indexes

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS commission_rates;

-- Create commission_rates table
CREATE TABLE commission_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL CHECK (role = 'seller'),
    rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_commission_rates_role ON commission_rates(role);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_commission_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commission_rates_updated_at
    BEFORE UPDATE ON commission_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_commission_rates_updated_at();

-- Create RLS policies
CREATE POLICY "Admins can read commission rates" 
    ON commission_rates
    FOR SELECT 
    TO authenticated 
    USING (true);

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

-- Insert default commission rate
INSERT INTO commission_rates (role, rate, description)
VALUES ('seller', 5.0, 'Taxa de comissão padrão para vendedores');