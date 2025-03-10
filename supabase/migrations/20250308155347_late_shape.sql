/*
  # Fix Database Permissions and Relationships

  1. Changes
    - Fix sales order sequence permissions
    - Update driver-vehicle relationships
    - Fix profile creation and permissions
    - Add missing RLS policies
    - Fix foreign key constraints

  2. Security
    - Proper RLS policies
    - Correct ownership and permissions
    - Secure function execution
*/

-- Fix sales order sequence
CREATE SEQUENCE IF NOT EXISTS public.sales_order_number_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

ALTER SEQUENCE public.sales_order_number_seq OWNER TO postgres;

-- Create function to generate next order number
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num bigint;
    year_prefix text;
BEGIN
    next_num := nextval('public.sales_order_number_seq');
    year_prefix := to_char(current_date, 'YYYY');
    RETURN year_prefix || LPAD(next_num::text, 6, '0');
END;
$$;

ALTER FUNCTION public.get_next_order_number() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;

-- Fix driver-vehicle relationship
ALTER TABLE IF EXISTS public.driver_vehicles 
    DROP CONSTRAINT IF EXISTS driver_vehicles_driver_id_fkey,
    ADD CONSTRAINT driver_vehicles_driver_id_fkey 
    FOREIGN KEY (driver_id) 
    REFERENCES public.drivers(id)
    ON DELETE CASCADE;

-- Fix profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Fix RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_order_links ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies
CREATE POLICY "Allow authenticated to read profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated to manage drivers"
    ON public.drivers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow authenticated to manage vehicles"
    ON public.vehicles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow authenticated to manage driver_vehicles"
    ON public.driver_vehicles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow authenticated to manage sales_orders"
    ON public.sales_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated to manage customer_order_links"
    ON public.customer_order_links
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;