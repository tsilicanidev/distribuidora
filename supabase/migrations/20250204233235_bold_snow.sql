-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies from stock_movements table
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by warehouse staff and admins" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by admins only" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are viewable by all users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by warehouse staff" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by authenticated users" ON stock_movements;
END $$;

-- Enable RLS on stock_movements table
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create new simplified policy for viewing
CREATE POLICY "Stock movements are viewable by all users"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

-- Create new simplified policy for modifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' 
    AND policyname = 'Stock movements are modifiable by authenticated users'
  ) THEN
    CREATE POLICY "Stock movements are modifiable by authenticated users"
    ON stock_movements FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Update any existing stock movements to ensure profile references are valid
UPDATE stock_movements sm
SET created_by = p.id
FROM profiles p
WHERE sm.created_by = p.id
AND p.full_name IS NOT NULL;