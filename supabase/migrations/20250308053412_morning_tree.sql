/*
  # Customer Orders Schema with Admin/Manager Access Control

  1. New Tables
    - `customer_order_links`: For managing external access tokens (admin/manager only)
    - `customer_orders`: For storing customer-created orders
    - `customer_order_items`: For storing order line items

  2. Security
    - Enable RLS on all tables
    - Admin/Manager only access for link creation
    - Public access for token validation
    - Protected access for order management

  3. Changes
    - Drop existing objects with CASCADE
    - Create new schema with proper dependencies
    - Add strict RLS policies for admin/manager access
*/

-- Drop existing objects with CASCADE
DROP POLICY IF EXISTS public_users_create_orders ON public.sales_orders CASCADE;
DROP POLICY IF EXISTS public_users_read_orders ON public.sales_orders CASCADE;
DROP POLICY IF EXISTS public_users_create_items ON public.sales_order_items CASCADE;
DROP POLICY IF EXISTS public_users_read_items ON public.sales_order_items CASCADE;

DROP TABLE IF EXISTS public.customer_order_items CASCADE;
DROP TABLE IF EXISTS public.customer_orders CASCADE;
DROP TABLE IF EXISTS public.customer_order_links CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  year_prefix text;
BEGIN
  year_prefix := to_char(current_date, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM public.customer_orders
  WHERE number LIKE year_prefix || '-%';
  
  RETURN year_prefix || '-' || LPAD(next_number::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create customer order links table
CREATE TABLE public.customer_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token text UNIQUE,
  active boolean DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer orders table
CREATE TABLE public.customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  order_link_id uuid REFERENCES public.customer_order_links(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer order items table
CREATE TABLE public.customer_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_customer_order_links_token ON public.customer_order_links(token);
CREATE INDEX idx_customer_order_links_customer ON public.customer_order_links(customer_id);
CREATE INDEX idx_customer_order_links_active ON public.customer_order_links(active) WHERE active = true;
CREATE INDEX idx_customer_orders_number ON public.customer_orders(number);
CREATE INDEX idx_customer_orders_status ON public.customer_orders(status);
CREATE INDEX idx_customer_orders_customer ON public.customer_orders(customer_id);
CREATE INDEX idx_customer_order_items_order ON public.customer_order_items(order_id);
CREATE INDEX idx_customer_order_items_product ON public.customer_order_items(product_id);

-- Create triggers
CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON public.customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies for customer_order_links
CREATE POLICY "admin_manager_create_links"
  ON public.customer_order_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  );

CREATE POLICY "admin_manager_update_links"
  ON public.customer_order_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  );

CREATE POLICY "admin_manager_delete_links"
  ON public.customer_order_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  );

CREATE POLICY "admin_manager_read_links"
  ON public.customer_order_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  );

CREATE POLICY "public_validate_links"
  ON public.customer_order_links
  FOR SELECT
  TO public
  USING (
    active = true 
    AND expires_at > now()
  );

-- Create policies for customer_orders
CREATE POLICY "admin_manager_access_orders"
  ON public.customer_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  );

CREATE POLICY "public_create_orders"
  ON public.customer_orders
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_order_links
      WHERE customer_order_links.id = order_link_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

CREATE POLICY "public_read_orders"
  ON public.customer_orders
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_order_links
      WHERE customer_order_links.id = order_link_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

-- Create policies for customer_order_items
CREATE POLICY "admin_manager_access_items"
  ON public.customer_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'master' OR 
        profiles.role = 'admin' OR 
        profiles.role = 'manager'
      )
    )
  );

CREATE POLICY "public_create_items"
  ON public.customer_order_items
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_orders
      JOIN public.customer_order_links ON customer_order_links.id = customer_orders.order_link_id
      WHERE customer_orders.id = order_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );

CREATE POLICY "public_read_items"
  ON public.customer_order_items
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_orders
      JOIN public.customer_order_links ON customer_order_links.id = customer_orders.order_link_id
      WHERE customer_orders.id = order_id
      AND customer_order_links.active = true
      AND customer_order_links.expires_at > now()
    )
  );