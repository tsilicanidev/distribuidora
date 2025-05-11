-- Create drivers table
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

-- Grant permissions
GRANT ALL ON drivers TO authenticated;

-- Create function to check driver availability
CREATE OR REPLACE FUNCTION check_driver_availability(driver_id uuid, check_date date)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM drivers
    WHERE id = driver_id
    AND driver_status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE driver_id = drivers.id
      AND date = check_date
      AND status IN ('pending', 'in_progress')
    )
  );
END;
$$ LANGUAGE plpgsql;