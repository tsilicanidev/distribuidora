-- First drop any existing policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by authenticated users" ON stock_movements;
END $$;

-- Then create new policies
DO $$ 
BEGIN
  -- Only create policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'Stock movements are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Stock movements are viewable by authenticated users"
    ON stock_movements FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'Stock movements are insertable by warehouse staff and admins'
  ) THEN
    CREATE POLICY "Stock movements are insertable by warehouse staff and admins"
    ON stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IN (
        SELECT id FROM profiles 
        WHERE role IN ('admin', 'manager', 'warehouse')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'Stock movements are updatable by warehouse staff and admins'
  ) THEN
    CREATE POLICY "Stock movements are updatable by warehouse staff and admins"
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'Stock movements are deletable by admins only'
  ) THEN
    CREATE POLICY "Stock movements are deletable by admins only"
    ON stock_movements FOR DELETE
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT id FROM profiles 
        WHERE role = 'admin'
      )
    );
  END IF;
END $$;