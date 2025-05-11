/*
  # Initial Schema Setup

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, with check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Users reading own profile
      - Users updating own basic info
      - Admin full access
    
  3. Functions & Triggers
    - `handle_new_user()` for auto-creating profiles
    - `sync_roles()` for syncing role changes
    - `ensure_master_profile()` for master user handling
    - `handle_master_user()` for master user metadata
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'seller',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role IN ('master', 'admin', 'manager', 'seller', 'warehouse', 'driver'))
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  _role text;
  _full_name text;
BEGIN
  -- Determine role
  IF TG_OP = 'INSERT' THEN
    IF NEW.email = 'admin@admin.com' THEN
      _role := 'master';
    ELSE
      _role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
    END IF;
    
    -- Get full name
    _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, _full_name, _role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to sync roles
CREATE OR REPLACE FUNCTION public.sync_roles() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql 
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to ensure master profile
CREATE OR REPLACE FUNCTION public.ensure_master_profile() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.email = 'admin@admin.com' THEN
      NEW.role := 'master';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to handle master user
CREATE OR REPLACE FUNCTION public.handle_master_user() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.email = 'admin@admin.com' THEN
      NEW.raw_user_meta_data := 
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'master');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS ensure_master_profile_trigger ON public.profiles;
DROP TRIGGER IF EXISTS handle_master_user_trigger ON auth.users;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_roles();

CREATE TRIGGER ensure_master_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_master_profile();

CREATE TRIGGER handle_master_user_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_master_user();

-- Create policies

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own basic info
DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;
CREATE POLICY "Users can update own basic info"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND id = (SELECT id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Admin/master users can do everything
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
CREATE POLICY "Admin full access"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'master')
    )
  );