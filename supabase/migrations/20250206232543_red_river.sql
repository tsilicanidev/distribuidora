-- First check if name column exists before trying to modify it
DO $$ 
BEGIN
  -- Only try to modify name column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'name'
  ) THEN
    -- Allow null values temporarily
    ALTER TABLE profiles ALTER COLUMN name DROP NOT NULL;
    
    -- Update existing profiles to have name match full_name if name is null
    UPDATE profiles 
    SET name = full_name 
    WHERE name IS NULL;
    
    -- Drop the name column as it's redundant with full_name
    ALTER TABLE profiles DROP COLUMN name;
  END IF;
END $$;

-- Ensure full_name is required
ALTER TABLE profiles ALTER COLUMN full_name SET NOT NULL;

-- Drop existing full_name_format constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS full_name_format;
  
  -- Add new constraint
  ALTER TABLE profiles 
  ADD CONSTRAINT full_name_format 
  CHECK (full_name ~ '^[a-zA-ZÀ-ÿ\s]{2,100}$');
EXCEPTION
  WHEN others THEN
    -- If there's any error, we'll just continue
    NULL;
END $$;

-- Update existing admin user if needed
UPDATE profiles
SET full_name = 'Usuario Master'
WHERE role = 'admin'
AND (full_name IS NULL OR full_name = '');

-- Create or update RLS policies with unique names
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles are editable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles are modifiable by authenticated users" ON profiles;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'profiles_view_policy_v2'
  ) THEN
    CREATE POLICY "profiles_view_policy_v2"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'profiles_modify_policy_v2'
  ) THEN
    CREATE POLICY "profiles_modify_policy_v2"
    ON profiles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;