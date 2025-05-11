/*
  # Add Commission Rate to Users
  
  1. Changes
    - Add commission_rate column to profiles table
    - Add index for better performance
    - Update existing users with default commission rate
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add commission_rate column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 5 CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON profiles(commission_rate);

-- Update existing seller users with default commission rate if not set
UPDATE profiles
SET commission_rate = 5
WHERE role = 'seller' AND commission_rate IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.commission_rate IS 'Commission rate percentage for seller users (0-100)';