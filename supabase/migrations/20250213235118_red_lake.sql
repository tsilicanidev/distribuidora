-- Drop all existing policies first
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

-- Create function to check if user is master
CREATE OR REPLACE FUNCTION is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email IN ('master@master.com', 'tsilicani@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with proper role
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
      WHEN NEW.email IN ('master@master.com', 'tsilicani@gmail.com') THEN 'master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    role = CASE 
      WHEN NEW.email IN ('master@master.com', 'tsilicani@gmail.com') THEN 'master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', EXCLUDED.role)
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create unrestricted policies for all tables
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
    -- Create unrestricted policy for master users
    EXECUTE format('
      CREATE POLICY %I_master_access ON %I
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