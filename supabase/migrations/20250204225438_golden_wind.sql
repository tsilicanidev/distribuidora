-- Drop existing RLS policies for stock_movements
DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
DROP POLICY IF EXISTS "Stock movements can be created by warehouse staff" ON stock_movements;

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "Stock movements are viewable by authenticated users"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Stock movements are insertable by authenticated users"
ON stock_movements FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Stock movements are updatable by authenticated users"
ON stock_movements FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Stock movements are deletable by authenticated users"
ON stock_movements FOR DELETE
TO authenticated
USING (true);