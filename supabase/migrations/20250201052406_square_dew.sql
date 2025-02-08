/*
  # Initial Schema Setup for Food Distribution System

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `role` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `price` (decimal)
      - `stock_quantity` (integer)
      - `min_stock` (integer)
      - `max_stock` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stock_movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `quantity` (integer)
      - `type` (text) -- 'IN' or 'OUT'
      - `reference_id` (uuid) -- For linking to orders/invoices
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
*/

-- Create tables
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'seller', 'warehouse')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  max_stock integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products NOT NULL,
  quantity integer NOT NULL,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  reference_id uuid,
  created_by uuid REFERENCES profiles NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles are editable by admins only" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

CREATE POLICY "Products are viewable by authenticated users" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Products are editable by admins and managers" ON products
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'manager')
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'manager')
  ));

CREATE POLICY "Stock movements are viewable by authenticated users" ON stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Stock movements can be created by warehouse staff" ON stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'manager', 'warehouse')
  ));