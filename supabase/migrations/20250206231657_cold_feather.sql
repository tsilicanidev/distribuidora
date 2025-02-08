-- First, allow null values temporarily to prevent constraint violations
ALTER TABLE profiles ALTER COLUMN name DROP NOT NULL;

-- Update existing profiles to have name match full_name if name is null
UPDATE profiles 
SET name = full_name 
WHERE name IS NULL;

-- Drop the name column as it's redundant with full_name
ALTER TABLE profiles DROP COLUMN name;

-- Ensure full_name is required
ALTER TABLE profiles ALTER COLUMN full_name SET NOT NULL;

-- Add constraint for full_name format
ALTER TABLE profiles 
ADD CONSTRAINT full_name_format 
CHECK (full_name ~ '^[a-zA-ZÀ-ÿ\s]{2,100}$');

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