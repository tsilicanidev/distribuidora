-- First drop all existing policies
DO $$ 
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOR table_name IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  )
  LOOP
    FOR policy_name IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = table_name
    )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I CASCADE', policy_name, table_name);
    END LOOP;
  END LOOP;
END $$;

-- Now safe to drop functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS ensure_user_profile() CASCADE;
DROP FUNCTION IF EXISTS is_master() CASCADE;

-- Create improved master check function
CREATE OR REPLACE FUNCTION is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'tsilicani@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved profile creation function
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Ensure we have a valid ID
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Create or update profile
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    CASE 
      WHEN NEW.email = 'tsilicani@gmail.com' THEN 'master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_profile();

-- Create new unrestricted policies for all tables
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  )
  LOOP
    -- Create new unrestricted policy
    EXECUTE format('
      CREATE POLICY %I_unrestricted ON %I
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true)
    ', table_name, table_name);
  END LOOP;
END $$;

-- Ensure all tables have RLS enabled
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Create master user profile if it doesn't exist
DO $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
  SELECT 
    id,
    'Usuario Master',
    'master',
    now(),
    now()
  FROM auth.users
  WHERE email = 'tsilicani@gmail.com'
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = 'Usuario Master',
    role = 'master',
    updated_at = now();
END $$;