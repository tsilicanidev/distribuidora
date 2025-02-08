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

-- Create policies with unique names
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_records' 
    AND policyname = 'vehicle_maintenance_view_policy_v2'
  ) THEN
    CREATE POLICY "vehicle_maintenance_view_policy_v2"
    ON vehicle_maintenance_records FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_records' 
    AND policyname = 'vehicle_maintenance_modify_policy_v2'
  ) THEN
    CREATE POLICY "vehicle_maintenance_modify_policy_v2"
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
  END IF;
END $$;

-- Create policies for driver_vehicles with unique names
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_vehicles' 
    AND policyname = 'driver_vehicles_view_policy_v2'
  ) THEN
    CREATE POLICY "driver_vehicles_view_policy_v2"
    ON driver_vehicles FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_vehicles' 
    AND policyname = 'driver_vehicles_modify_policy_v2'
  ) THEN
    CREATE POLICY "driver_vehicles_modify_policy_v2"
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
  END IF;
END $$;