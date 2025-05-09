/*
  # Customer Order Portal Links

  1. New Tables
    - `customer_order_links`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `token` (text, unique)
      - `active` (boolean)
      - `expires_at` (timestamptz)
      - `created_by` (uuid, references users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `customer_order_links` table
    - Add policies for authenticated users
*/

-- Create customer order links table
CREATE TABLE IF NOT EXISTS customer_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT token_length CHECK (char_length(token) >= 32)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_order_links_customer ON customer_order_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_token ON customer_order_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_active ON customer_order_links(active) WHERE active = true;

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Managers and admins can manage customer order links"
  ON customer_order_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Create function to generate secure token
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token text;
BEGIN
  -- Generate a random 32 character token
  token := encode(gen_random_bytes(24), 'hex');
  RETURN token;
END;
$$;