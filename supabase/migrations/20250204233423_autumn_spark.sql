-- First clean up any existing problematic policies
DO $$ 
BEGIN
  -- Drop all existing policies from stock_movements table
  DROP POLICY IF EXISTS "Stock movements are viewable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are insertable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are updatable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are deletable by authenticated users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are viewable by all users" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by warehouse staff" ON stock_movements;
  DROP POLICY IF EXISTS "Stock movements are modifiable by authenticated users" ON stock_movements;
END $$;

-- Enable RLS on stock_movements table
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies for stock_movements table
CREATE POLICY "Stock movements are viewable by all users"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Stock movements are modifiable by authenticated users"
ON stock_movements FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add missing fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS license_category text,
ADD COLUMN IF NOT EXISTS license_expiry date,
ADD COLUMN IF NOT EXISTS driver_status text CHECK (driver_status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave'));

-- Create function to update driver status
CREATE OR REPLACE FUNCTION update_driver_status(
  p_driver_id uuid,
  p_status text
)
RETURNS void AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave') THEN
    RAISE EXCEPTION 'Invalid driver status';
  END IF;

  -- Update driver status
  UPDATE profiles
  SET 
    driver_status = p_status,
    updated_at = now()
  WHERE id = p_driver_id
  AND role = 'driver';
END;
$$ LANGUAGE plpgsql;

-- Create function to check driver license expiry
CREATE OR REPLACE FUNCTION check_driver_license_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- If license is expired or expires in less than 30 days, set status to off_duty
  IF NEW.license_expiry IS NOT NULL AND 
     NEW.license_expiry <= (CURRENT_DATE + INTERVAL '30 days') THEN
    NEW.driver_status = 'off_duty';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for driver license expiry check
CREATE TRIGGER check_license_expiry_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'driver')
  EXECUTE FUNCTION check_driver_license_expiry();