/*
  # Add helper_name to delivery_notes table
  
  1. Changes
    - Add helper_name column to delivery_notes table
    - Make route_id nullable since we're replacing it with helper_name
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add helper_name column if it doesn't exist
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS helper_name text;

-- Make route_id nullable
ALTER TABLE delivery_notes 
ALTER COLUMN route_id DROP NOT NULL;