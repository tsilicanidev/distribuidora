/*
  # Add Commission Rate to Profiles Table

  1. Changes
    - Add commission_rate column to profiles table
    - Add check constraint to ensure valid values (0-100)
    - Add index for better performance
    
  2. Description
    - This column stores the commission rate percentage for seller users
    - Default value is 5%
    - Valid range is 0-100%
*/

-- Add commission_rate column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 5 CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON profiles(commission_rate);

-- Add comment to explain the column
COMMENT ON COLUMN profiles.commission_rate IS 'Commission rate percentage for seller users (0-100)';

-- Update existing seller users with default commission rate if not set
UPDATE profiles
SET commission_rate = 5
WHERE role = 'seller' AND commission_rate IS NULL;