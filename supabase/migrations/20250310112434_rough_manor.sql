/*
  # User Management System Setup
  
  1. Changes
    - Add functions to manage master user
    - Add protection for master user role
    - Add validation for admin operations
  
  2. Security
    - Ensure master user cannot be removed
    - Protect admin operations
*/

-- Create function to ensure master user exists
CREATE OR REPLACE FUNCTION ensure_master_profile()
RETURNS TRIGGER AS $$
DECLARE
  master_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO master_count
    FROM profiles
    WHERE role = 'master' AND id != OLD.id;
    
    IF OLD.role = 'master' AND master_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last master user';
    END IF;
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO master_count
    FROM profiles
    WHERE role = 'master' AND id != NEW.id;
    
    IF OLD.role = 'master' AND NEW.role != 'master' AND master_count = 0 THEN
      RAISE EXCEPTION 'Cannot change role of the last master user';
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle master user creation
CREATE OR REPLACE FUNCTION handle_master_user()
RETURNS TRIGGER AS $$
DECLARE
  master_exists boolean;
BEGIN
  IF NEW.role = 'master' THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE role = 'master'
    ) INTO master_exists;
    
    IF master_exists THEN
      RAISE EXCEPTION 'Master user already exists';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for master user protection
DROP TRIGGER IF EXISTS ensure_master_profile_trigger ON profiles;
CREATE TRIGGER ensure_master_profile_trigger
  BEFORE DELETE OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_master_profile();

-- Add trigger for master user creation
DROP TRIGGER IF EXISTS handle_master_user_trigger ON profiles;
CREATE TRIGGER handle_master_user_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_master_user();