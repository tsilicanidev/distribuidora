/*
  # Update RLS Policies for Customer Order Links

  1. Changes
    - Add RLS policies for customer_order_links table
    - Allow authenticated users to manage order links
    - Allow public access to validate active tokens
    - Ensure proper security for order link management

  2. Security
    - Enable RLS on customer_order_links table
    - Add policies for different access patterns
    - Ensure proper authentication checks
*/

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to manage order links" ON customer_order_links;
DROP POLICY IF EXISTS "Allow public token validation" ON customer_order_links;
DROP POLICY IF EXISTS "Allow managers and admins to manage customer order links" ON customer_order_links;

-- Create policies for authenticated users
CREATE POLICY "Allow managers and admins to manage customer order links"
ON customer_order_links
FOR ALL
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

-- Allow public access for token validation
CREATE POLICY "Allow public token validation"
ON customer_order_links
FOR SELECT
TO public
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Add created_by NOT NULL constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_order_links'
    AND column_name = 'created_by'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE customer_order_links ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;