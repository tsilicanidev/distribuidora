/*
  # Fix RLS Policies

  1. Changes
    - Drop all existing policies
    - Create new policies with proper role checks
    - Add missing policies for customers table
    - Fix policy conflicts

  2. Security
    - Enable RLS on all tables
    - Add proper role-based access control
    - Ensure data isolation between users
*/

-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
  DROP POLICY IF EXISTS "Customers are viewable by authenticated users" ON customers;
  DROP POLICY IF EXISTS "Customers are editable by authenticated users" ON customers;
END $$;

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
CREATE POLICY "Products are viewable by authenticated users"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Products are editable by admins and managers"
ON products FOR ALL
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

-- Create policies for stock movements table
CREATE POLICY "Stock movements are viewable by authenticated users"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Stock movements are insertable by warehouse staff"
ON stock_movements FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager', 'warehouse')
  )
);

CREATE POLICY "Stock movements are updatable by warehouse staff"
ON stock_movements FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager', 'warehouse')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager', 'warehouse')
  )
);

CREATE POLICY "Stock movements are deletable by admins"
ON stock_movements FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'admin'
  )
);

-- Create policies for customers table
CREATE POLICY "Customers are viewable by authenticated users"
ON customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Customers are editable by admins and managers"
ON customers FOR ALL
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