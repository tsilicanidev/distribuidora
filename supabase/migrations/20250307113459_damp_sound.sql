/*
  # Customer Order Links Update

  1. Changes
    - Add link_id column to customer_order_links table
    - Create necessary indexes for performance
    - Enable RLS and set up security policies
    - Add trigger for updated_at timestamp

  2. Security
    - Enable RLS on customer_order_links table
    - Create policies for public and authenticated access
    - Only managers and admins can manage links
*/

-- Update customer_order_links table
ALTER TABLE customer_order_links 
ADD COLUMN IF NOT EXISTS link_id uuid DEFAULT gen_random_uuid();

-- Create unique index for link_id
CREATE UNIQUE INDEX IF NOT EXISTS customer_order_links_link_id_key 
ON customer_order_links(link_id);

-- Create index for active links
CREATE INDEX IF NOT EXISTS idx_customer_order_links_active 
ON customer_order_links(active) 
WHERE active = true;

-- Create index for customer lookup
CREATE INDEX IF NOT EXISTS idx_customer_order_links_customer 
ON customer_order_links(customer_id);

-- Create index for link lookup
CREATE INDEX IF NOT EXISTS idx_customer_order_links_link_id 
ON customer_order_links(link_id);

-- Add comment to table
COMMENT ON TABLE customer_order_links IS 'Links for customers to access their order portal';

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop existing policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'Anyone can read active links'
  ) THEN
    DROP POLICY "Anyone can read active links" ON customer_order_links;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'Managers and admins can create customer order links'
  ) THEN
    DROP POLICY "Managers and admins can create customer order links" ON customer_order_links;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'Managers and admins can update customer order links'
  ) THEN
    DROP POLICY "Managers and admins can update customer order links" ON customer_order_links;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'Managers and admins can delete customer order links'
  ) THEN
    DROP POLICY "Managers and admins can delete customer order links" ON customer_order_links;
  END IF;
END $$;

-- Create policies for customer_order_links
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
TO anon, authenticated
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Managers and admins can create customer order links"
ON customer_order_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

CREATE POLICY "Managers and admins can update customer order links"
ON customer_order_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

CREATE POLICY "Managers and admins can delete customer order links"
ON customer_order_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'manager')
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_order_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_order_links_updated_at ON customer_order_links;
CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_links_updated_at();