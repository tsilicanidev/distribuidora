/*
  # Add Profile Creation Trigger

  1. Functions
    - Add function to handle profile creation
    - Add function to validate admin operations

  2. Triggers
    - Add trigger for profile creation
*/

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure email is unique
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = NEW.email 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  -- Set created_at if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;

  -- Set updated_at
  NEW.updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile creation
DROP TRIGGER IF EXISTS before_profile_insert ON profiles;
CREATE TRIGGER before_profile_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_creation();

-- Create function to validate admin operations
CREATE OR REPLACE FUNCTION validate_admin_operation()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this operation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin operations
DROP TRIGGER IF EXISTS before_profile_admin_operation ON profiles;
CREATE TRIGGER before_profile_admin_operation
  BEFORE INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_admin_operation();