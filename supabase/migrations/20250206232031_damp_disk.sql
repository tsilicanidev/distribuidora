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
END $$;

-- Enable RLS on stock_movements table
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

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
END $$;

-- Update any existing stock movements to ensure profile references are valid
UPDATE stock_movements sm
SET created_by = p.id
FROM profiles p
WHERE sm.created_by = p.id
AND p.full_name IS NOT NULL;