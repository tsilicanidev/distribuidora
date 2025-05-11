/*
  # Initial Schema Setup
  
  1. Tables
    - products
    - profiles
    - customers
    - sales_orders
    - sales_order_items
    
  2. Policies
    - Basic RLS policies for all tables
    - Role-based access control
    
  3. Functions
    - Stock availability check
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Staff can manage products" ON products;
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Sellers can create orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can view relevant orders" ON sales_orders;
DROP POLICY IF EXISTS "Staff can update orders" ON sales_orders;
DROP POLICY IF EXISTS "Sellers can create order items" ON sales_order_items;
DROP POLICY IF EXISTS "Users can view relevant order items" ON sales_order_items;

-- Create products table first
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  max_stock integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('admin', 'manager', 'seller', 'warehouse', 'driver')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  fantasia text,
  loja text,
  cpf_cnpj text NOT NULL UNIQUE,
  ie text,
  simples text CHECK (simples IN ('sim', 'não')),
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  celular text,
  contato text,
  email text NOT NULL,
  email_nfe text,
  vendedor text,
  rede text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create sales_orders table
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  total_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales_order_items table
CREATE TABLE IF NOT EXISTS sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Basic policies for profiles (without recursion)
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Everyone can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for products
CREATE POLICY "Users can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policies for customers
CREATE POLICY "Users can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policies for sales_orders
CREATE POLICY "Sellers can create orders"
  ON sales_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'seller'
    )
  );

CREATE POLICY "Users can view relevant orders"
  ON sales_orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = seller_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

CREATE POLICY "Staff can update orders"
  ON sales_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policies for sales_order_items
CREATE POLICY "Sellers can create order items"
  ON sales_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE id = sales_order_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can view relevant order items"
  ON sales_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE id = sales_order_id AND (
        seller_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.uid() = id AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
      )
    )
  );

-- Create function to check stock availability
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