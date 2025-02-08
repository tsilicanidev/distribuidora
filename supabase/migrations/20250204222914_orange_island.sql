-- Drop existing RLS policies for stock_movements
DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
DROP POLICY IF EXISTS "Stock movements are insertable by authenticated users" ON stock_movements;
DROP POLICY IF EXISTS "Stock movements are updatable by authenticated users" ON stock_movements;
DROP POLICY IF EXISTS "Stock movements are deletable by authenticated users" ON stock_movements;

-- Create new RLS policies with proper role checks
CREATE POLICY "Stock movements are viewable by authenticated users"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Stock movements are insertable by warehouse staff and admins"
ON stock_movements FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager', 'warehouse')
  )
);

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

CREATE POLICY "Stock movements are deletable by admins only"
ON stock_movements FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'admin'
  )
);