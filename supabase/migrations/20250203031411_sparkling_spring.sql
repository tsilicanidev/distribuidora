/*
  # Update username login function
  
  1. Changes
    - Drop existing username_login function
    - Create new username_login function that returns user_id and role
  
  2. Security
    - Function is security definer to run with elevated privileges
    - Returns only necessary user information
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Create new function with specified signature
CREATE OR REPLACE FUNCTION public.username_login(
  username TEXT,
  password TEXT
)
RETURNS TABLE(user_id UUID, user_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.role
  FROM auth.users u
  WHERE u.username = username
  AND u.encrypted_password = crypt(password, u.encrypted_password);
END;
$$;