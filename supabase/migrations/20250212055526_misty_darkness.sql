/*
  # Update RLS Policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Recreate policies with proper access control
    - Update policies to use master role

  2. Security
    - Role-based access control
    - Master user access
    - Data isolation
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Staff can manage products" ON products;
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Anyone can view orders" ON sales_orders;
DROP POLICY IF EXISTS "Sellers can manage own orders" ON sales_orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON sales_order_items;
DROP POLICY IF EXISTS "Staff can manage order items" ON sales_order_items;
DROP POLICY IF EXISTS "Staff can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Staff can manage stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Anyone can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Staff can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "Anyone can view routes" ON delivery_routes;
DROP POLICY IF EXISTS "Staff can manage routes" ON delivery_routes;
DROP POLICY IF EXISTS "Anyone can view delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Staff can manage delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Anyone can view delivery note items" ON delivery_note_items;
DROP POLICY IF EXISTS "Staff can manage delivery note items" ON delivery_note_items;
DROP POLICY IF EXISTS "Anyone can view maintenance records" ON vehicle_maintenance_records;
DROP POLICY IF EXISTS "Staff can manage maintenance records" ON vehicle_maintenance_records;
DROP POLICY IF EXISTS "Anyone can view driver assignments" ON driver_vehicles;
DROP POLICY IF EXISTS "Staff can manage driver assignments" ON driver_vehicles;

-- Create new policies with proper access control
CREATE POLICY "Public read access for profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    is_master() OR
    (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'tsilicani@gmail.com'
  );

CREATE POLICY "Allow profile updates"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    is_master() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.email = 'tsilicani@gmail.com'
      )
    )
  );

-- Policies for products
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager', 'warehouse'])
  );

-- Policies for customers
CREATE POLICY "Anyone can view customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager'])
  );

-- Policies for sales_orders
CREATE POLICY "Anyone can view orders"
  ON sales_orders FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage own orders"
  ON sales_orders FOR ALL
  TO authenticated
  USING (
    seller_id = auth.uid() OR
    user_has_role(ARRAY['master', 'admin', 'manager'])
  );

-- Policies for sales_order_items
CREATE POLICY "Anyone can view order items"
  ON sales_order_items FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage order items"
  ON sales_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE id = sales_order_id AND (
        seller_id = auth.uid() OR
        user_has_role(ARRAY['master', 'admin', 'manager'])
      )
    )
  );

-- Policies for stock_movements
CREATE POLICY "Staff can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager', 'warehouse'])
  );

CREATE POLICY "Staff can manage stock movements"
  ON stock_movements FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager', 'warehouse'])
  );

-- Policies for vehicles
CREATE POLICY "Anyone can view vehicles"
  ON vehicles FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager'])
  );

-- Policies for delivery_routes
CREATE POLICY "Anyone can view routes"
  ON delivery_routes FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage routes"
  ON delivery_routes FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager'])
  );

-- Policies for delivery_notes
CREATE POLICY "Anyone can view delivery notes"
  ON delivery_notes FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage delivery notes"
  ON delivery_notes FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager', 'warehouse'])
  );

-- Policies for delivery_note_items
CREATE POLICY "Anyone can view delivery note items"
  ON delivery_note_items FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage delivery note items"
  ON delivery_note_items FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager', 'warehouse'])
  );

-- Policies for vehicle_maintenance_records
CREATE POLICY "Anyone can view maintenance records"
  ON vehicle_maintenance_records FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage maintenance records"
  ON vehicle_maintenance_records FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager'])
  );

-- Policies for driver_vehicles
CREATE POLICY "Anyone can view driver assignments"
  ON driver_vehicles FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage driver assignments"
  ON driver_vehicles FOR ALL
  TO authenticated
  USING (
    user_has_role(ARRAY['master', 'admin', 'manager'])
  );