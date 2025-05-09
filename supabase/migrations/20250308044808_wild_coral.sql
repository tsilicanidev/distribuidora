/*
  # Setup Customer Order Links

  1. New Tables
    - customer_order_links
      - id (uuid, primary key)
      - customer_id (uuid, references customers)
      - token (text)
      - active (boolean)
      - expires_at (timestamptz)
      - created_by (uuid, references users)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for managers and admins
    - Add policies for public access to active links
    
  3. Indexes
    - Index on customer_id for faster lookups
    - Index on token for validation
    - Index on active status
*/

-- Create customer order links table
CREATE TABLE IF NOT EXISTS public.customer_order_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token text,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_order_links ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_order_links_customer ON public.customer_order_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_token ON public.customer_order_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_order_links_active ON public.customer_order_links(active) WHERE active = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_customer_order_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_customer_order_links_updated_at ON public.customer_order_links;
CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON public.customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_links_updated_at();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow managers and admins to manage customer order links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Allow public token validation" ON public.customer_order_links;
DROP POLICY IF EXISTS "Anyone can read active links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON public.customer_order_links;

-- Create new policies
CREATE POLICY "Managers and admins can create customer order links"
ON public.customer_order_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers and admins can delete customer order links"
ON public.customer_order_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers and admins can update customer order links"
ON public.customer_order_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow public access to validate tokens
CREATE POLICY "Allow public token validation"
ON public.customer_order_links
FOR SELECT
TO public
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Allow public to read active links
CREATE POLICY "Anyone can read active links"
ON public.customer_order_links
FOR SELECT
TO anon, authenticated
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);