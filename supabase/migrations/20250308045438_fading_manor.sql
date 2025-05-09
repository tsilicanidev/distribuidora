/*
  # Fix customer order links table and policies

  1. New Tables
    - `customer_order_links`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `token` (text)
      - `active` (boolean)
      - `expires_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `customer_order_links` table
    - Add policies for:
      - Managers and admins to manage links
      - Public access for token validation
      - Public read access for active links

  3. Changes
    - Add indexes for performance
    - Add updated_at trigger
*/

-- Create customer order links table if it doesn't exist
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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_customer_order_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_customer_order_links_updated_at ON public.customer_order_links;

-- Create updated_at trigger
CREATE TRIGGER update_customer_order_links_updated_at
  BEFORE UPDATE ON public.customer_order_links
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_links_updated_at();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers and admins can create customer order links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can delete customer order links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Managers and admins can update customer order links" ON public.customer_order_links;
DROP POLICY IF EXISTS "Allow public token validation" ON public.customer_order_links;
DROP POLICY IF EXISTS "Anyone can read active links" ON public.customer_order_links;

-- Create new policies
CREATE POLICY "Managers and admins can create customer order links"
ON public.customer_order_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
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
    SELECT 1 FROM profiles
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
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Allow public token validation"
ON public.customer_order_links
FOR SELECT
TO public
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Anyone can read active links"
ON public.customer_order_links
FOR SELECT
TO anon, authenticated
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);