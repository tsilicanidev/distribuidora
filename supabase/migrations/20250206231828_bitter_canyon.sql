-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies from stock_movements table
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are viewable by all users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by warehouse staff" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
END $$;

-- Create new policies with unique names
DO $$ 
BEGIN
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
    AND policyname = 'stock_movements_insert_policy'
  ) THEN
    CREATE POLICY "stock_movements_insert_policy"
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
    AND policyname = 'stock_movements_update_policy'
  ) THEN
    CREATE POLICY "stock_movements_update_policy"
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
    AND policyname = 'stock_movements_delete_policy'
  ) THEN
    CREATE POLICY "stock_movements_delete_policy"
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