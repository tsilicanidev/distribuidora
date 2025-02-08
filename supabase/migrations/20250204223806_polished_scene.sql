-- Create drivers table
CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles NOT NULL,
  license_number text NOT NULL,
  license_category text NOT NULL,
  license_expiry date NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL UNIQUE,
  model text NOT NULL,
  brand text NOT NULL,
  year integer NOT NULL,
  type text NOT NULL CHECK (type IN ('truck', 'van', 'car')),
  capacity_weight decimal(10,2) NOT NULL,
  capacity_volume decimal(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'maintenance', 'in_use')),
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle maintenance records table
CREATE TABLE vehicle_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles ON DELETE CASCADE NOT NULL,
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
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
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

-- Create policies for vehicles
CREATE POLICY "Vehicles are viewable by authenticated users"
ON vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Vehicles are modifiable by admins and managers"
ON vehicles FOR ALL
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

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();