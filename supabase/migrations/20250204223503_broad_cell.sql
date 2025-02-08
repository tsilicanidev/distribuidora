-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies from products table
  DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by admins and managers" ON products;
  
  -- Drop all existing policies from stock_movements table
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
  
  -- Drop all existing policies from customers table
  DROP POLICY IF EXISTS "Customers are viewable by authenticated users" ON customers;
  DROP POLICY IF EXISTS "Customers are editable by authenticated users" ON customers;
  DROP POLICY IF EXISTS "Customers are editable by admins and managers" ON customers;
END $$;

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create new policies for products table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Products are viewable by all users'
  ) THEN
    CREATE POLICY "Products are viewable by all users"
    ON products FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Products are modifiable by admins and managers'
  ) THEN
    CREATE POLICY "Products are modifiable by admins and managers"
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
  END IF;
END $$;

-- Create new policies for stock movements table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' AND policyname = 'Stock movements are viewable by all users'
  ) THEN
    CREATE POLICY "Stock movements are viewable by all users"
    ON stock_movements FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' AND policyname = 'Stock movements are modifiable by warehouse staff'
  ) THEN
    CREATE POLICY "Stock movements are modifiable by warehouse staff"
    ON stock_movements FOR ALL
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
  END IF;
END $$;

-- Create new policies for customers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customers are viewable by all users'
  ) THEN
    CREATE POLICY "Customers are viewable by all users"
    ON customers FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customers are modifiable by admins and managers'
  ) THEN
    CREATE POLICY "Customers are modifiable by admins and managers"
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
  END IF;
END $$;