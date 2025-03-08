/*
  # Fix Master Role and Profile Creation

  1. Changes
    - Add master role function
    - Update profile creation trigger
    - Fix role checks
    - Add master user handling

  2. Security
    - Ensure master user always has correct role
    - Fix role-based access control
*/

-- Function to check if user is master
CREATE OR REPLACE FUNCTION is_master()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email = 'tsilicani@gmail.com'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'tsilicani@gmail.com' THEN
    -- Create master profile
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      'Usuario Master',
      'master'
    );
  ELSE
    -- Create regular profile
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to get user role safely
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    -- Create profile if it doesn't exist
    INSERT INTO profiles (id, full_name, role)
    VALUES (
      auth.uid(),
      COALESCE(current_setting('request.jwt.claims', true)::json->>'full_name', 'Unknown User'),
      CASE 
        WHEN auth.jwt()->>'email' = 'tsilicani@gmail.com' THEN 'master'
        ELSE COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'user')
      END
    )
    RETURNING role INTO user_role;
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;