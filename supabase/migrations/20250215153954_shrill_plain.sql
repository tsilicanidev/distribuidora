-- Add email field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Create index on email field
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users
DO $$
BEGIN
  UPDATE profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id
  AND p.email IS NULL;
END $$;