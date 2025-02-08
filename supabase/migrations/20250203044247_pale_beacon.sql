/*
  # Create Delivery Notes System

  1. New Tables
    - `delivery_notes`
      - Main delivery note information
      - Tracks status, vehicle, driver, and route details
    - `delivery_note_items`
      - Items to be delivered
      - Links to orders and products
    - `delivery_routes`
      - Pre-defined delivery routes
      - Helps organize deliveries by region
    - `vehicles`
      - Vehicle fleet management
      - Tracks vehicle details and maintenance

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create vehicles table
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL UNIQUE,
  model text NOT NULL,
  brand text NOT NULL,
  year integer NOT NULL,
  capacity decimal(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'maintenance', 'in_use')),
  last_maintenance timestamptz,
  next_maintenance timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery routes table
CREATE TABLE delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  estimated_time interval,
  regions text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery notes table
CREATE TABLE delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id uuid REFERENCES vehicles NOT NULL,
  route_id uuid REFERENCES delivery_routes NOT NULL,
  driver_id uuid REFERENCES profiles NOT NULL,
  helper_id uuid REFERENCES profiles,
  start_time timestamptz,
  end_time timestamptz,
  status text NOT NULL CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  total_weight decimal(10,2) DEFAULT 0,
  total_volume decimal(10,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery note items table
CREATE TABLE delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  weight decimal(10,2),
  volume decimal(10,2),
  delivery_sequence integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'delivered', 'returned', 'damaged')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Vehicles are viewable by authenticated users"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vehicles are editable by authenticated users"
  ON vehicles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Delivery routes are viewable by authenticated users"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Delivery routes are editable by authenticated users"
  ON delivery_routes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Delivery notes are viewable by authenticated users"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Delivery notes are editable by authenticated users"
  ON delivery_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Delivery note items are viewable by authenticated users"
  ON delivery_note_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Delivery note items are editable by authenticated users"
  ON delivery_note_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update delivery note totals
CREATE OR REPLACE FUNCTION update_delivery_note_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE delivery_notes
  SET 
    total_weight = (
      SELECT COALESCE(SUM(weight * quantity), 0)
      FROM delivery_note_items
      WHERE delivery_note_id = NEW.delivery_note_id
    ),
    total_volume = (
      SELECT COALESCE(SUM(volume * quantity), 0)
      FROM delivery_note_items
      WHERE delivery_note_id = NEW.delivery_note_id
    ),
    updated_at = now()
  WHERE id = NEW.delivery_note_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating totals
CREATE TRIGGER update_delivery_note_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON delivery_note_items
FOR EACH ROW
EXECUTE FUNCTION update_delivery_note_totals();