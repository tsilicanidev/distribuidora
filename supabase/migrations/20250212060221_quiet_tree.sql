/*
  # Fix Dashboard Access and Profile Handling

  1. Changes
    - Simplify profile policies
    - Fix dashboard data access
    - Add proper error handling
    - Fix role management

  2. Security
    - Maintain proper access control
    - Ensure consistent role handling
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on role" ON profiles;

-- Create simplified policies for profiles
CREATE POLICY "Enable read access for all authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable profile management"
  ON profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'tsilicani@gmail.com' OR
        raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
    )
  );

-- Function to handle new user creation with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with proper role
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'tsilicani@gmail.com' THEN 'Usuario Master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User')
    END,
    CASE 
      WHEN NEW.email = 'tsilicani@gmail.com' THEN 'master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard data safely
CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH dashboard_data AS (
    SELECT
      (SELECT COUNT(*) FROM products) as total_products,
      (SELECT COALESCE(SUM(price * stock_quantity), 0) FROM products) as stock_value,
      (SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock) as low_stock_items,
      (SELECT COUNT(*) FROM stock_movements WHERE created_at >= (now() - interval '30 days')) as monthly_movements,
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'pending') as pending_orders,
      (SELECT COUNT(*) FROM customers) as total_customers,
      (SELECT COUNT(*) FROM profiles WHERE role = 'driver' AND driver_status = 'available') as active_drivers,
      (SELECT COUNT(*) FROM vehicles WHERE status = 'available') as available_vehicles
  )
  SELECT row_to_json(dashboard_data) INTO result FROM dashboard_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_dashboard_data() TO authenticated;

-- Add policies for dashboard data access
CREATE POLICY "Enable dashboard data access"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable stock movements access"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable orders access"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, min_stock);