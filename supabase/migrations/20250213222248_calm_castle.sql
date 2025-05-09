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

-- Create trigger to ensure profile exists for new users
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    CASE 
      WHEN NEW.email = 'tsilicani@gmail.com' THEN 'master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_profile();

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;