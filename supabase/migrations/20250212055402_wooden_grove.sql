/*
  # Security Functions

  1. Functions
    - User role management
    - Access control helpers
    - Master user handling

  2. Security
    - Role-based access control
    - Master user privileges
*/

-- Function to check if user is master
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

-- Function to check user roles
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

-- Function to sync user metadata with profile
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

-- Create trigger for master user
DROP TRIGGER IF EXISTS on_auth_user_created_master ON auth.users;
CREATE TRIGGER on_auth_user_created_master
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_master_profile();

-- Create trigger for role sync
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_roles();