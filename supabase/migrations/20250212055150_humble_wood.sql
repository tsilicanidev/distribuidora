/*
  # Fix Master User Profile Access

  1. Changes
    - Add master role to valid roles
    - Update profile policies for master access
    - Add function to handle master user creation

  2. Security
    - Maintain RLS while allowing necessary operations
    - Ensure master role has full access
*/

-- Add master role to valid roles
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('master', 'admin', 'manager', 'seller', 'warehouse', 'driver'));

-- Function to ensure master profile exists
CREATE OR REPLACE FUNCTION ensure_master_profile()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'tsilicani@gmail.com' THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      'Usuario Master',
      'master'
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'master',
        full_name = 'Usuario Master';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for master user
DROP TRIGGER IF EXISTS on_auth_user_created_master ON auth.users;
CREATE TRIGGER on_auth_user_created_master
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_master_profile();

-- Update existing policies to include master role
CREATE OR REPLACE FUNCTION user_has_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = ANY(required_roles) OR role = 'master')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sync_roles function to handle master role
CREATE OR REPLACE FUNCTION sync_roles()
RETURNS trigger AS $$
BEGIN
  -- Prevent changing master role
  IF OLD.role = 'master' AND NEW.role != 'master' THEN
    RAISE EXCEPTION 'Cannot change master role';
  END IF;

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', NEW.role,
    'full_name', NEW.full_name
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure master user has access to all data
CREATE OR REPLACE FUNCTION is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include master access
DROP POLICY IF EXISTS "Public read access for profiles" ON profiles;
CREATE POLICY "Public read access for profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    is_master() OR
    (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'tsilicani@gmail.com'
  );

DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
CREATE POLICY "Allow profile updates"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR
    is_master() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.email = 'tsilicani@gmail.com'
      )
    )
  );