-- Drop existing tables if they exist
DROP TABLE IF EXISTS vehicle_maintenance_records;
DROP TABLE IF EXISTS driver_vehicles;

-- Create vehicle maintenance records table
CREATE TABLE vehicle_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles NOT NULL,
  maintenance_date timestamptz NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  cost decimal(10,2) NOT NULL,
  service_provider text,
  created_by uuid REFERENCES profiles NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create driver_vehicles table for assignments
CREATE TABLE driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles NOT NULL,
  vehicle_id uuid REFERENCES vehicles NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (driver_id, vehicle_id, start_date)
);

-- Add driver-specific fields to profiles if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS license_category text,
ADD COLUMN IF NOT EXISTS license_expiry date,
ADD COLUMN IF NOT EXISTS driver_status text CHECK (driver_status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave'));

-- Enable RLS
ALTER TABLE vehicle_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle_maintenance_records
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

-- Create policies for driver_vehicles
CREATE POLICY "Driver vehicles are viewable by authenticated users"
ON driver_vehicles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Driver vehicles are modifiable by admins and managers"
ON driver_vehicles FOR ALL
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

-- Create function to check vehicle availability
CREATE OR REPLACE FUNCTION check_vehicle_availability(vehicle_id uuid, check_date date)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM driver_vehicles 
    WHERE vehicle_id = $1 
    AND status = 'active'
    AND start_date <= $2 
    AND (end_date IS NULL OR end_date >= $2)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to check driver availability
CREATE OR REPLACE FUNCTION check_driver_availability(driver_id uuid, check_date date)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM driver_vehicles 
    WHERE driver_id = $1 
    AND status = 'active'
    AND start_date <= $2 
    AND (end_date IS NULL OR end_date >= $2)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to assign vehicle to driver
CREATE OR REPLACE FUNCTION assign_vehicle_to_driver(
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Check if driver exists and is a driver
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_driver_id 
    AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Invalid driver ID or user is not a driver';
  END IF;

  -- Check if vehicle exists
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE id = p_vehicle_id
  ) THEN
    RAISE EXCEPTION 'Invalid vehicle ID';
  END IF;

  -- Check if vehicle is available for the period
  IF NOT check_vehicle_availability(p_vehicle_id, p_start_date) THEN
    RAISE EXCEPTION 'Vehicle is not available for the specified period';
  END IF;

  -- Check if driver is available for the period
  IF NOT check_driver_availability(p_driver_id, p_start_date) THEN
    RAISE EXCEPTION 'Driver is not available for the specified period';
  END IF;

  -- Create assignment
  INSERT INTO driver_vehicles (
    driver_id,
    vehicle_id,
    start_date,
    end_date,
    status
  )
  VALUES (
    p_driver_id,
    p_vehicle_id,
    p_start_date,
    p_end_date,
    'active'
  )
  RETURNING id INTO v_id;

  -- Update vehicle status
  UPDATE vehicles
  SET status = 'in_use'
  WHERE id = p_vehicle_id;

  -- Update driver status
  UPDATE profiles
  SET driver_status = 'on_delivery'
  WHERE id = p_driver_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to end vehicle assignment
CREATE OR REPLACE FUNCTION end_vehicle_assignment(
  p_assignment_id uuid,
  p_end_date date
)
RETURNS void AS $$
BEGIN
  -- Update assignment
  UPDATE driver_vehicles
  SET 
    end_date = p_end_date,
    status = 'inactive'
  WHERE id = p_assignment_id;

  -- Update vehicle status
  UPDATE vehicles v
  SET status = 'available'
  FROM driver_vehicles dv
  WHERE dv.id = p_assignment_id
  AND dv.vehicle_id = v.id;

  -- Update driver status
  UPDATE profiles p
  SET driver_status = 'available'
  FROM driver_vehicles dv
  WHERE dv.id = p_assignment_id
  AND dv.driver_id = p.id;
END;
$$ LANGUAGE plpgsql;