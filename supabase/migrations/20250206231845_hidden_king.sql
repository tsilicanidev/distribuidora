-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by authenticated users" ON products;
  DROP POLICY IF EXISTS "Products are editable by admins and managers" ON products;
  DROP POLICY IF EXISTS "products_view_policy" ON products;
  DROP POLICY IF EXISTS "products_modify_policy" ON products;
  
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
  DROP POLICY IF EXISTS "stock_movements_view_policy" ON stock_movements;
  DROP POLICY IF EXISTS "stock_movements_modify_policy" ON stock_movements;
  
  DROP POLICY IF EXISTS "Customers are viewable by authenticated users" ON customers;
  DROP POLICY IF EXISTS "Customers are editable by authenticated users" ON customers;
  DROP POLICY IF EXISTS "Customers are editable by admins and managers" ON customers;
  DROP POLICY IF EXISTS "customers_view_policy" ON customers;
  DROP POLICY IF EXISTS "customers_modify_policy" ON customers;
END $$;

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names
DO $$ 
BEGIN
  -- Products policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'products_view_policy'
  ) THEN
    CREATE POLICY "products_view_policy"
    ON products FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'products_modify_policy'
  ) THEN
    CREATE POLICY "products_modify_policy"
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

  -- Stock movements policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'stock_movements_view_policy'
  ) THEN
    CREATE POLICY "stock_movements_view_policy"
    ON stock_movements FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'stock_movements_modify_policy'
  ) THEN
    CREATE POLICY "stock_movements_modify_policy"
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

  -- Customers policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' 
    AND policyname = 'customers_view_policy'
  ) THEN
    CREATE POLICY "customers_view_policy"
    ON customers FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' 
    AND policyname = 'customers_modify_policy'
  ) THEN
    CREATE POLICY "customers_modify_policy"
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