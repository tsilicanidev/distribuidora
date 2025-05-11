-- Create or replace the dashboard data function with proper error handling
CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH dashboard_data AS (
    SELECT
      COALESCE(COUNT(*), 0) as total_products,
      COALESCE(SUM(price * stock_quantity), 0) as stock_value,
      COALESCE(COUNT(*) FILTER (WHERE stock_quantity <= min_stock), 0) as low_stock_items,
      COALESCE((
        SELECT COUNT(*) 
        FROM stock_movements 
        WHERE created_at >= (now() - interval '30 days')
      ), 0) as monthly_movements,
      COALESCE((
        SELECT COUNT(*) 
        FROM sales_orders 
        WHERE status = 'pending'
      ), 0) as pending_orders,
      COALESCE((SELECT COUNT(*) FROM customers), 0) as total_customers,
      COALESCE((
        SELECT COUNT(*) 
        FROM profiles 
        WHERE role = 'driver' 
        AND driver_status = 'available'
      ), 0) as active_drivers,
      COALESCE((
        SELECT COUNT(*) 
        FROM vehicles 
        WHERE status = 'available'
      ), 0) as available_vehicles
    FROM products
  )
  SELECT row_to_json(dashboard_data) INTO result FROM dashboard_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION get_dashboard_data() TO authenticated;

-- Fix profile creation trigger to handle errors gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with proper role and error handling
  BEGIN
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

    -- Update user metadata to ensure consistency
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'role', CASE 
        WHEN NEW.email = 'tsilicani@gmail.com' THEN 'master'
        ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
      END,
      'full_name', CASE 
        WHEN NEW.email = 'tsilicani@gmail.com' THEN 'Usuario Master'
        ELSE COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User')
      END
    )
    WHERE id = NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_driver_status ON profiles(role, driver_status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, min_stock);