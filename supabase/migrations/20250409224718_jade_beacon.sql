-- Create a security definer function to perform all operations
-- This bypasses RLS and trigger-based checks completely
CREATE OR REPLACE FUNCTION perform_admin_operations_with_master_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  master_count integer;
BEGIN
  -- First check if there are any master users
  SELECT COUNT(*) INTO master_count
  FROM profiles
  WHERE role = 'master';

  -- Add commission_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'commission_rate'
  ) THEN
    EXECUTE 'ALTER TABLE profiles ADD COLUMN commission_rate numeric DEFAULT 5';
  END IF;

  -- Add constraint to commission_rate if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_commission_rate_check'
  ) THEN
    EXECUTE 'ALTER TABLE profiles
    ADD CONSTRAINT profiles_commission_rate_check
    CHECK (commission_rate >= 0 AND commission_rate <= 100)';
  END IF;

  -- Add comment to explain the column
  EXECUTE 'COMMENT ON COLUMN profiles.commission_rate IS ''Commission rate percentage for seller users (0-100)''';

  -- Create index for better performance
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON profiles(commission_rate)';

  -- Update existing roles to either admin or seller, but preserve master users
  IF master_count > 0 THEN
    -- If master users exist, don't change them
    EXECUTE 'UPDATE profiles
      SET role = CASE 
        WHEN role = ''admin'' THEN ''admin''
        WHEN role = ''master'' THEN ''master''
        ELSE ''seller''
      END
      WHERE role NOT IN (''admin'', ''seller'', ''master'')';
  ELSE
    -- If no master users exist, convert all to admin or seller
    EXECUTE 'UPDATE profiles
      SET role = CASE 
        WHEN role IN (''admin'', ''master'') THEN ''admin''
        ELSE ''seller''
      END
      WHERE role NOT IN (''admin'', ''seller'')';
  END IF;

  -- Update role constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_valid_role'
  ) THEN
    EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT check_valid_role';
  END IF;

  -- Add constraint that includes master if needed
  IF master_count > 0 THEN
    EXECUTE 'ALTER TABLE profiles
    ADD CONSTRAINT check_valid_role
    CHECK (role IN (''admin'', ''seller'', ''master''))';
  ELSE
    EXECUTE 'ALTER TABLE profiles
    ADD CONSTRAINT check_valid_role
    CHECK (role IN (''admin'', ''seller''))';
  END IF;
END;
$$;

-- Create function to check if user is admin or master
CREATE OR REPLACE FUNCTION is_admin_or_master()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Try to get the user's role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE profiles.id = auth.uid();
  
  -- Return true if admin or master
  RETURN user_role IN ('admin', 'master');
  
-- Handle the case where the table doesn't exist or other errors
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to perform all admin operations
SELECT perform_admin_operations_with_master_check();

-- Drop the function after use
DROP FUNCTION perform_admin_operations_with_master_check();

-- Drop existing policies
DO $$ 
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
  END LOOP;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create new simplified policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    CREATE POLICY "enable_profiles_read"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "enable_profiles_write"
      ON public.profiles FOR ALL
      TO authenticated
      USING (
        (auth.uid() = id) OR
        is_admin_or_master()
      )
      WITH CHECK (
        (auth.uid() = id) OR
        is_admin_or_master()
      );
  END IF;
END $$;

-- Add admin access policy for all tables
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename != 'schema_migrations'
  ) LOOP
    -- Skip tables that might cause issues
    IF table_name NOT IN ('pg_stat_statements', 'schema_migrations') THEN
      BEGIN
        EXECUTE format('
          DROP POLICY IF EXISTS %I_admin_master_access ON public.%I;
        ', table_name, table_name);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors from dropping policies
        NULL;
      END;
      
      BEGIN
        EXECUTE format('
          CREATE POLICY %I_admin_master_access ON public.%I
          FOR ALL
          TO authenticated
          USING (is_admin_or_master())
          WITH CHECK (is_admin_or_master())
        ', table_name, table_name);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors from creating policies
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- Enable RLS if profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;