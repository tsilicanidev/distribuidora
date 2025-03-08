/*
  # Add Missing Tables and Fix Relations

  1. New Tables
    - `delivery_notes`
    - `delivery_note_items`
    - `delivery_routes`
    - `vehicles`
    - `vehicle_maintenance_records`
    - `driver_vehicles`

  2. Changes
    - Add missing foreign key relationships
    - Update profiles table with driver-specific fields
    - Add RLS policies for new tables

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table
*/

-- Add driver-specific fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_category text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_expiry timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_status text CHECK (driver_status IN ('available', 'on_delivery', 'off_duty', 'vacation', 'sick_leave'));

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text UNIQUE NOT NULL,
  model text NOT NULL,
  brand text NOT NULL,
  year integer NOT NULL,
  capacity numeric NOT NULL CHECK (capacity > 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'in_use')),
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_routes table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_notes table
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  route_id uuid REFERENCES delivery_routes(id) NOT NULL,
  driver_id uuid REFERENCES profiles(id) NOT NULL,
  helper_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
  total_weight numeric NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_note_items table
CREATE TABLE IF NOT EXISTS delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES sales_orders(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  weight numeric NOT NULL DEFAULT 0,
  volume numeric NOT NULL DEFAULT 0,
  delivery_sequence integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create vehicle_maintenance_records table
CREATE TABLE IF NOT EXISTS vehicle_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'emergency', 'inspection')),
  description text,
  cost numeric NOT NULL CHECK (cost >= 0),
  service_provider text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create driver_vehicles table
CREATE TABLE IF NOT EXISTS driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Policies for vehicles
CREATE POLICY "Users can view vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policies for delivery_routes
CREATE POLICY "Users can view routes"
  ON delivery_routes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage routes"
  ON delivery_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policies for delivery_notes
CREATE POLICY "Users can view delivery notes"
  ON delivery_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage delivery notes"
  ON delivery_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'warehouse')
    )
  );

-- Policies for delivery_note_items
CREATE POLICY "Users can view delivery note items"
  ON delivery_note_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage delivery note items"
  ON delivery_note_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'warehouse')
    )
  );

-- Policies for vehicle_maintenance_records
CREATE POLICY "Users can view maintenance records"
  ON vehicle_maintenance_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage maintenance records"
  ON vehicle_maintenance_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policies for driver_vehicles
CREATE POLICY "Users can view driver assignments"
  ON driver_vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage driver assignments"
  ON driver_vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id 
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Create functions for vehicle and driver management
CREATE OR REPLACE FUNCTION check_driver_availability(driver_id uuid, check_date date)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = driver_id
    AND role = 'driver'
    AND driver_status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE driver_id = profiles.id
      AND date = check_date
      AND status IN ('pending', 'in_progress')
    )
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_vehicle_availability(vehicle_id uuid, check_date date)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vehicles
    WHERE id = vehicle_id
    AND status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE vehicle_id = vehicles.id
      AND date = check_date
      AND status IN ('pending', 'in_progress')
    )
  );
END;
$$ LANGUAGE plpgsql;