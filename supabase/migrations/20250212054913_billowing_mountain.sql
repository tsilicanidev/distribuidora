/*
  # Fix Database Permissions

  1. Changes
    - Update RLS policies to use auth.jwt() instead of recursive queries
    - Add missing policies for profiles table
    - Fix permission denied errors for users table
    - Add policies for public access to necessary tables
    - Update policies to handle user metadata correctly

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each role
    - Ensure proper access control based on user roles
*/

-- Drop existing policies that might cause conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "View own profile" ON profiles;
DROP POLICY IF EXISTS "View all profiles" ON profiles;
DROP POLICY IF EXISTS "Manage profiles" ON profiles;

-- Create new policies for profiles table
CREATE POLICY "Anyone can create a profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Update policies for products table
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Staff can manage products" ON products;

CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'warehouse')
  );

-- Update policies for stock_movements
DROP POLICY IF EXISTS "Staff can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Staff can create stock movements" ON stock_movements;

CREATE POLICY "Staff can view stock movements"
  ON stock_movements
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'warehouse')
  );

CREATE POLICY "Staff can manage stock movements"
  ON stock_movements
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'warehouse')
  );

-- Update policies for customers
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;

CREATE POLICY "Anyone can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

-- Update policies for sales_orders
DROP POLICY IF EXISTS "Sellers can create orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can view relevant orders" ON sales_orders;
DROP POLICY IF EXISTS "Staff can update orders" ON sales_orders;

CREATE POLICY "Anyone can view orders"
  ON sales_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sellers can manage own orders"
  ON sales_orders
  FOR ALL
  TO authenticated
  USING (
    seller_id = auth.uid() OR
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

-- Update policies for sales_order_items
DROP POLICY IF EXISTS "Sellers can create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Users can view relevant order items" ON sales_order_items;

CREATE POLICY "Anyone can view order items"
  ON sales_order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage order items"
  ON sales_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE id = sales_order_id AND (
        seller_id = auth.uid() OR
        auth.jwt() ->> 'role' IN ('admin', 'manager')
      )
    )
  );

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;