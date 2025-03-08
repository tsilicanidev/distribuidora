/*
  # Customer Order Links Security Policies
  
  1. Security Changes
    - Enable RLS on customer_order_links table
    - Add policies for:
      - Creating links (managers and admins)
      - Reading links (managers, admins, and anonymous users)
      - Updating links (managers and admins)
      - Deleting links (managers and admins)
  
  2. Description
    - Managers and admins can manage all links
    - Anonymous users can validate active tokens
    - Authenticated users can view links
*/

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

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