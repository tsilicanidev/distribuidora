/*
  # Add Commission Rates Table

  1. Changes
    - Create commission_rates table
    - Set up RLS policies
    - Add necessary indexes
    - Add default commission rate

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create commission_rates table
CREATE TABLE commission_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL CHECK (role = 'seller'),
    rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 100),
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE(role)
);

-- Enable RLS
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_commission_rates_role ON commission_rates(role);

-- Create update trigger
CREATE TRIGGER update_commission_rates_updated_at
    BEFORE UPDATE ON commission_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Admins can manage commission rates"
    ON commission_rates
    FOR ALL
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
VALUES ('seller', 5.0, 'Taxa de comissão padrão para vendedores')
ON CONFLICT (role) DO NOTHING;