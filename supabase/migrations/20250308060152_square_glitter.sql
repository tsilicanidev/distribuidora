/*
  # Customer Order Links Schema

  1. New Tables
    - customer_order_links
      - id (uuid, primary key)
      - customer_id (uuid, references customers)
      - token (text, unique)
      - active (boolean)
      - expires_at (timestamptz)
      - created_by (uuid, references auth.users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for:
      - Admin/Manager access
      - Public token validation
*/

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create customer_order_links table
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

-- Enable RLS
ALTER TABLE public.customer_order_links ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_order_links_token ON public.customer_order_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_customer ON public.customer_order_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_active ON public.customer_order_links(active) WHERE active = true;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_order_links_updated_at ON public.customer_order_links;
CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON public.customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies
DROP POLICY IF EXISTS "admin_manager_access_links" ON public.customer_order_links;
DROP POLICY IF EXISTS "public_validate_links" ON public.customer_order_links;

-- Create policies
CREATE POLICY "admin_manager_access_links"
  ON public.customer_order_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('master', 'admin', 'manager')
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