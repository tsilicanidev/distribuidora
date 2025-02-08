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
END $$;

-- Enable RLS on stock_movements table
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies for stock_movements table
CREATE POLICY "Stock movements are viewable by all users"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Stock movements are modifiable by authenticated users"
ON stock_movements FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);