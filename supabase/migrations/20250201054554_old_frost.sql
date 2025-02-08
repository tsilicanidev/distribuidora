/*
  # Update authentication system

  1. Changes
    - Add username and full_name columns to profiles table
    - Add unique constraint on username
    - Update admin user with username

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN username text UNIQUE,
ADD COLUMN full_name text;

-- Update admin user profile
UPDATE profiles 
SET username = 'admin',
    full_name = 'Administrator'
WHERE role = 'admin';