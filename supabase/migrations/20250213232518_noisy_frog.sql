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

-- Create function to handle new master users
CREATE OR REPLACE FUNCTION handle_master_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IN ('master@master.com', 'tsilicani@gmail.com') THEN
    -- Create or update profile for master user
    INSERT INTO public.profiles (
      id,
      full_name,
      role,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'Master',
      'master',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      full_name = 'Master',
      role = 'master',
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for handling master users
DROP TRIGGER IF EXISTS on_auth_user_created_master ON auth.users;
CREATE TRIGGER on_auth_user_created_master
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_master_user();

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
    EXECUTE format('
      CREATE POLICY %I_unrestricted ON %I
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND email IN (''master@master.com'', ''tsilicani@gmail.com'')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND email IN (''master@master.com'', ''tsilicani@gmail.com'')
        )
      )
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