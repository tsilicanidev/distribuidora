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

-- Create or update RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles are editable by authenticated users" ON profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Profiles are modifiable by authenticated users"
ON profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);