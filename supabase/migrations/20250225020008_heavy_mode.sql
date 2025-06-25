-- Drop existing driver_vehicles table if it exists
DROP TABLE IF EXISTS driver_vehicles CASCADE;

-- Create driver_vehicles table with correct references
CREATE TABLE driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
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
CREATE POLICY "driver_vehicles_unrestricted"
  ON driver_vehicles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_vehicle ON driver_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_status ON driver_vehicles(status);

-- Grant necessary permissions
GRANT ALL ON driver_vehicles TO authenticated;

-- Add driver-specific fields to profiles if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS license_category text,
ADD COLUMN IF NOT EXISTS license_expiry timestamptz,
ADD COLUMN IF NOT EXISTS driver_status text CHECK (driver_status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave'));