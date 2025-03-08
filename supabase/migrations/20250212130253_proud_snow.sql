-- Function to check if current user is master
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

-- Drop all existing policies
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
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    END LOOP;

    -- Create new unrestricted policy for master user
    EXECUTE format('
      CREATE POLICY %I_master_access ON %I
      FOR ALL
      TO authenticated
      USING (
        CASE 
          WHEN is_master() THEN true
          ELSE false
        END
      )
      WITH CHECK (
        CASE 
          WHEN is_master() THEN true
          ELSE false
        END
      )
    ', table_name, table_name);
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;