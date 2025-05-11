/*
  # Customer Orders Schema

  1. New Tables
    - customer_order_links: Stores links for customer orders with expiration and token
    - customer_orders: Stores customer orders with status and totals
    - customer_order_items: Stores order items with quantities and prices

  2. Security
    - Enable RLS on all tables
    - Add indexes for performance
*/

-- Create tables
CREATE TABLE IF NOT EXISTS public.customer_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token text UNIQUE,
  active boolean DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_orders (
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

CREATE TABLE IF NOT EXISTS public.customer_order_items (
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
CREATE INDEX IF NOT EXISTS idx_customer_order_links_token ON public.customer_order_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_customer ON public.customer_order_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_active ON public.customer_order_links(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_customer_orders_number ON public.customer_orders(number);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON public.customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON public.customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_items_order ON public.customer_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_items_product ON public.customer_order_items(product_id);