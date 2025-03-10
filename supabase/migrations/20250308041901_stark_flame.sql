/*
  # Customer Order Links Policies

  1. Security Changes
    - Enable RLS on customer_order_links table
    - Drop existing policies to avoid conflicts
    - Create new policies for:
      - Creating links (managers and admins only)
      - Reading links (public for active links, managers/admins for all)
      - Updating links (managers and admins only)
      - Deleting links (managers and admins only)

  2. Access Control
    - Public users can only read active, non-expired links
    - Managers and admins have full CRUD access
    - Authenticated users without proper roles have no access
*/

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON customer_order_links;

-- Policy for creating links (managers and admins)
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

-- Policy for reading links
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
USING (
  (active = true AND (expires_at IS NULL OR expires_at > now()))
  OR 
  (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  )
);

-- Policy for updating links (managers and admins)
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

-- Policy for deleting links (managers and admins)
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