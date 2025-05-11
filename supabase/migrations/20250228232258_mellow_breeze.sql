-- Create drivers table if it doesn't exist
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  license_number text NOT NULL,
  license_category text NOT NULL,
  license_expiry timestamptz NOT NULL,
  driver_status text CHECK (driver_status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create unrestricted policy
CREATE POLICY "drivers_unrestricted" ON drivers
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Drop existing driver_vehicles table
DROP TABLE IF EXISTS driver_vehicles CASCADE;

-- Recreate driver_vehicles table with correct reference to drivers table
CREATE TABLE driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Create unrestricted policy
CREATE POLICY "driver_vehicles_unrestricted" ON driver_vehicles
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_vehicle ON driver_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_status ON driver_vehicles(status);

-- Grant necessary permissions
GRANT ALL ON drivers TO authenticated;
GRANT ALL ON driver_vehicles TO authenticated;