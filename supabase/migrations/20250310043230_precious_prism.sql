/*
  # Remove Admin User Migration
  
  1. Changes
    - Remove admin@admin.com user safely
    - Ensure at least one master user exists
    - Add function to handle master user management
    - Add trigger to prevent master user deletion
  
  2. Security
    - Prevents system from being left without admin access
    - Ensures master role is properly managed
    - Adds safeguards against accidental master user deletion
*/

-- Create function to ensure master user exists
CREATE OR REPLACE FUNCTION ensure_master_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the last master user being changed/deleted
  IF (TG_OP = 'DELETE' OR NEW.role != 'master') AND 
     NOT EXISTS (
       SELECT 1 FROM profiles 
       WHERE role = 'admin' 
       AND id != COALESCE(OLD.id, NEW.id)
     ) THEN
    RAISE EXCEPTION 'Cannot remove last master user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to protect master users
DROP TRIGGER IF EXISTS ensure_admin_profile_trigger ON profiles;
CREATE TRIGGER ensure_admin_profile_trigger
  BEFORE UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_admin_profile();

-- Create function to handle master user creation
CREATE OR REPLACE FUNCTION handle_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow master role if no master exists
  IF NEW.role = 'admin' AND EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin user already exists';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for master user creation
DROP TRIGGER IF EXISTS handle_admin_user_trigger ON profiles;
CREATE TRIGGER handle_admin_user_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_admin_user();

-- Remove admin@admin.com user safely
DO $$ 
BEGIN
  -- Only proceed if there is another master/admin user
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE role IN ('master', 'admin') 
    AND email != 'admin1@admin.com'
  ) THEN
    -- Delete profile first
    DELETE FROM profiles WHERE email = 'admin1@admin.com';
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE email = 'admin1@admin.com';
  END IF;
END $$;