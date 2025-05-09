/*
  # Customer Order Links Schema

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
    - Enable RLS
    - Add policies for:
      - Public token validation
      - Admin/manager management
      - Public read access for active links

  3. Indexes
    - Customer ID
    - Token
    - Active status
*/

DO $$ BEGIN
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

  -- Create indexes if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_order_links_customer') THEN
    CREATE INDEX idx_customer_order_links_customer ON public.customer_order_links(customer_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_order_links_token') THEN
    CREATE INDEX idx_customer_order_links_token ON public.customer_order_links(token);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_order_links_active') THEN
    CREATE INDEX idx_customer_order_links_active ON public.customer_order_links(active) WHERE active = true;
  END IF;

END $$;

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

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "customer_order_links_master_access" ON public.customer_order_links;
  DROP POLICY IF EXISTS "managers_admins_manage_links" ON public.customer_order_links;
  DROP POLICY IF EXISTS "public_token_validation" ON public.customer_order_links;
  DROP POLICY IF EXISTS "public_read_active_links" ON public.customer_order_links;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'customer_order_links_master_access'
  ) THEN
    CREATE POLICY "customer_order_links_master_access"
    ON public.customer_order_links
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'managers_admins_manage_links'
  ) THEN
    CREATE POLICY "managers_admins_manage_links"
    ON public.customer_order_links
    FOR ALL
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'public_token_validation'
  ) THEN
    CREATE POLICY "public_token_validation"
    ON public.customer_order_links
    FOR SELECT
    TO public
    USING (
      active = true 
      AND (expires_at IS NULL OR expires_at > now())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_order_links' 
    AND policyname = 'public_read_active_links'
  ) THEN
    CREATE POLICY "public_read_active_links"
    ON public.customer_order_links
    FOR SELECT
    TO anon, authenticated
    USING (
      active = true 
      AND (expires_at IS NULL OR expires_at > now())
    );
  END IF;
END $$;