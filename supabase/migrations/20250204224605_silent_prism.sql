-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies from stock_movements table
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by warehouse staff" ON stock_movements;
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