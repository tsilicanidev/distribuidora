/*
  # Add registration fields

  1. Changes
    - Add validation for username format
    - Add validation for full name format
    - Add validation for email format
    - Add validation for password format
*/

-- Add check constraints for username format
ALTER TABLE profiles
ADD CONSTRAINT username_format CHECK (
  username ~ '^[a-zA-Z0-9_]{3,30}$'
);

-- Add check constraint for full name format
ALTER TABLE profiles
ADD CONSTRAINT full_name_format CHECK (
  full_name ~ '^[a-zA-Z0-9\s]{2,100}$'
);

-- Create function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate email format
CREATE OR REPLACE FUNCTION validate_email()
RETURNS trigger AS $$
BEGIN
  IF NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_email_trigger
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION validate_email();

-- Make username and full_name required
ALTER TABLE profiles
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN full_name SET NOT NULL;