/*
  # Update Policies and Functions

  1. Changes
    - Drop existing policies safely
    - Create new policies for profiles
    - Add function for dashboard data
    - Add necessary indexes
  
  2. Security
    - Enable proper access control
    - Add function security
*/

-- First check if policies exist before dropping
DO $$ 
BEGIN
  -- Drop policies only if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable dashboard data access' AND tablename = 'products') THEN
    DROP POLICY "Enable dashboard data access" ON products;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable stock movements access' AND tablename = 'stock_movements') THEN
    DROP POLICY "Enable stock movements access" ON stock_movements;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable orders access' AND tablename = 'sales_orders') THEN
    DROP POLICY "Enable orders access" ON sales_orders;
  END IF;
END $$;

-- Create simplified policies for profiles
CREATE POLICY "Enable read access for authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Function to get dashboard data safely
CREATE OR REPLACE FUNCTION get_dashboard_data(OUT dashboard json)
RETURNS json AS $$
BEGIN
  SELECT json_build_object(
    'total_products', COALESCE((SELECT COUNT(*) FROM products), 0),
    'stock_value', COALESCE((SELECT SUM(price * stock_quantity) FROM products), 0),
    'low_stock_items', COALESCE((SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock), 0),
    'monthly_movements', COALESCE((
      SELECT COUNT(*) 
      FROM stock_movements 
      WHERE created_at >= (now() - interval '30 days')
    ), 0),
    'pending_orders', COALESCE((
      SELECT COUNT(*) 
      FROM sales_orders 
      WHERE status = 'pending'
    ), 0),
    'total_customers', COALESCE((SELECT COUNT(*) FROM customers), 0),
    'active_drivers', COALESCE((
      SELECT COUNT(*) 
      FROM profiles 
      WHERE role = 'driver' 
      AND driver_status = 'available'
    ), 0),
    'available_vehicles', COALESCE((
      SELECT COUNT(*) 
      FROM vehicles 
      WHERE status = 'available'
    ), 0)
  ) INTO dashboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_dashboard_data() TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, min_stock);