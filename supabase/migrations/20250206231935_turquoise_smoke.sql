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
ALTER TABLE vehicle_maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for drivers with unique names
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'drivers' 
    AND policyname = 'drivers_view_policy'
  ) THEN
    CREATE POLICY "drivers_view_policy"
    ON drivers FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'drivers' 
    AND policyname = 'drivers_modify_policy'
  ) THEN
    CREATE POLICY "drivers_modify_policy"
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
  END IF;
END $$;

-- Create policies for vehicle maintenance records with unique names
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_records' 
    AND policyname = 'vehicle_maintenance_view_policy'
  ) THEN
    CREATE POLICY "vehicle_maintenance_view_policy"
    ON vehicle_maintenance_records FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicle_maintenance_records' 
    AND policyname = 'vehicle_maintenance_modify_policy'
  ) THEN
    CREATE POLICY "vehicle_maintenance_modify_policy"
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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at with IF NOT EXISTS check
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();