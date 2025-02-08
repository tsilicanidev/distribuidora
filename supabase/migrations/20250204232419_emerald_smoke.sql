-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies from products table
  DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by admins and managers" ON products;
  DROP POLICY IF EXISTS "Products are viewable by all users" ON products;
  DROP POLICY IF EXISTS "Products are modifiable by admins and managers" ON products;
END $$;

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies for products table
CREATE POLICY "Products are viewable by all users"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Products are insertable by admins and managers"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Products are updatable by admins and managers"
ON products FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Products are deletable by admins and managers"
ON products FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);