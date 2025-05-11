/*
  # Business Logic Functions

  1. Functions
    - Stock management
    - Vehicle management
    - Order processing

  2. Security
    - Data validation
    - Business rules
*/

-- Function to check stock availability
CREATE OR REPLACE FUNCTION check_stock_availability(order_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM sales_order_items soi
    JOIN products p ON p.id = soi.product_id
    WHERE soi.sales_order_id = order_id
    AND soi.quantity > p.stock_quantity
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check driver availability
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

-- Function to check vehicle availability
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

-- Function to assign vehicle to driver
CREATE OR REPLACE FUNCTION assign_vehicle_to_driver(
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Validate driver
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_driver_id AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Invalid driver ID';
  END IF;

  -- Validate vehicle
  IF NOT EXISTS (
    SELECT 1 FROM vehicles
    WHERE id = p_vehicle_id AND status = 'available'
  ) THEN
    RAISE EXCEPTION 'Vehicle not available';
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
  RETURNING id INTO v_assignment_id;

  -- Update vehicle status
  UPDATE vehicles
  SET status = 'in_use'
  WHERE id = p_vehicle_id;

  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;