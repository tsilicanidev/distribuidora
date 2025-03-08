/*
  # Create customer order links table

  1. New Tables
    - `customer_order_links`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `token` (text, unique, min length 32)
      - `active` (boolean)
      - `expires_at` (timestamp with time zone)
      - `created_by` (uuid, references users)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `customer_order_links` table
    - Add policy for managers and admins to manage links
    - Add policy for public access to validate tokens

  3. Indexes
    - Index on token for fast lookups
    - Index on customer_id for relationship queries
    - Index on active status for filtering active links
*/

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Managers and admins can manage customer order links" ON customer_order_links;
  DROP POLICY IF EXISTS "Anyone can validate active tokens" ON customer_order_links;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create customer order links table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT token_length CHECK (char_length(token) >= 32)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_order_links_token ON customer_order_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_customer ON customer_order_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_active ON customer_order_links(active) WHERE active = true;

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

-- Policy for managers and admins to manage links
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

-- Policy for public access to validate tokens
CREATE POLICY "Anyone can validate active tokens"
  ON customer_order_links
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_customer_order_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_links_updated_at();

-- Add comment
COMMENT ON TABLE customer_order_links IS 'Links for customers to access their order portal';