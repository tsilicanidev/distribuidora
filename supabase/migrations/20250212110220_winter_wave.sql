-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_dashboard_data();

-- Create improved dashboard data function with better error handling
CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH dashboard_data AS (
    SELECT
      COALESCE(COUNT(*), 0) as total_products,
      COALESCE(SUM(CASE WHEN price IS NOT NULL AND stock_quantity IS NOT NULL 
                   THEN price * stock_quantity 
                   ELSE 0 
                   END), 0) as stock_value,
      COALESCE((
        SELECT COUNT(*)
        FROM products p2
        WHERE p2.stock_quantity <= p2.min_stock
      ), 0) as low_stock_items,
      (
        SELECT COALESCE(COUNT(*), 0)
        FROM stock_movements 
        WHERE created_at >= (now() - interval '30 days')
      ) as monthly_movements,
      (
        SELECT COALESCE(COUNT(*), 0)
        FROM sales_orders 
        WHERE status = 'pending'
      ) as pending_orders,
      (SELECT COALESCE(COUNT(*), 0) FROM customers) as total_customers,
      (
        SELECT COALESCE(COUNT(*), 0)
        FROM profiles 
        WHERE role = 'driver' 
        AND driver_status = 'available'
      ) as active_drivers,
      (
        SELECT COALESCE(COUNT(*), 0)
        FROM vehicles 
        WHERE status = 'available'
      ) as available_vehicles
    FROM products
  )
  SELECT row_to_json(dashboard_data) INTO result FROM dashboard_data;
  
  RETURN COALESCE(result, '{
    "total_products": 0,
    "stock_value": 0,
    "low_stock_items": 0,
    "monthly_movements": 0,
    "pending_orders": 0,
    "total_customers": 0,
    "active_drivers": 0,
    "available_vehicles": 0
  }'::json);

EXCEPTION WHEN OTHERS THEN
  -- Log error and return empty dashboard data
  RAISE WARNING 'Error in get_dashboard_data: %', SQLERRM;
  RETURN json_build_object(
    'total_products', 0,
    'stock_value', 0,
    'low_stock_items', 0,
    'monthly_movements', 0,
    'pending_orders', 0,
    'total_customers', 0,
    'active_drivers', 0,
    'available_vehicles', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE stock_quantity <= min_stock
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions
REVOKE ALL ON FUNCTION get_dashboard_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_products() TO authenticated;

-- Add necessary indexes for performance
DROP INDEX IF EXISTS idx_products_stock_price;
DROP INDEX IF EXISTS idx_stock_movements_recent;
DROP INDEX IF EXISTS idx_sales_orders_pending;
DROP INDEX IF EXISTS idx_profiles_available_drivers;
DROP INDEX IF EXISTS idx_vehicles_available;

CREATE INDEX IF NOT EXISTS idx_products_stock_price ON products(stock_quantity, price);
CREATE INDEX IF NOT EXISTS idx_stock_movements_recent ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_pending ON sales_orders(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_profiles_available_drivers ON profiles(role, driver_status) WHERE role = 'driver';
CREATE INDEX IF NOT EXISTS idx_vehicles_available ON vehicles(status) WHERE status = 'available';