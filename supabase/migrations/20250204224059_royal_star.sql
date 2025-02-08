-- Create drivers table if it doesn't exist
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles NOT NULL,
  license_number text NOT NULL,
  license_category text NOT NULL,
  license_expiry date NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle maintenance records table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicle_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  maintenance_date timestamptz NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  cost decimal(10,2) NOT NULL,
  service_provider text,
  created_by uuid REFERENCES profiles NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for drivers
CREATE POLICY "Drivers are viewable by authenticated users"
ON drivers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Drivers are modifiable by admins and managers"
ON drivers FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

-- Create policies for vehicle maintenance records
CREATE POLICY "Vehicle maintenance records are viewable by authenticated users"
ON vehicle_maintenance_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Vehicle maintenance records are modifiable by admins and managers"
ON vehicle_maintenance_records FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();