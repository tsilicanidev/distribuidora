-- Drop existing delivery_routes table if it exists
DROP TABLE IF EXISTS delivery_routes CASCADE;

-- Create delivery_routes table with correct structure
CREATE TABLE delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

-- Create unrestricted policy
CREATE POLICY "delivery_routes_unrestricted" ON delivery_routes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_routes_name ON delivery_routes(name);

-- Grant necessary permissions
GRANT ALL ON delivery_routes TO authenticated;

-- Update delivery_notes table to reference delivery_routes correctly
ALTER TABLE delivery_notes
  DROP CONSTRAINT IF EXISTS fk_route,
  ADD CONSTRAINT fk_route FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE RESTRICT;