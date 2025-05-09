/*
  # Add delivery address fields to delivery_note_items
  
  1. Changes
    - Add detailed address fields to delivery_note_items table
    - This allows storing structured address data for each delivery
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add delivery address fields if they don't exist
ALTER TABLE delivery_note_items 
ADD COLUMN IF NOT EXISTS delivery_address_street text,
ADD COLUMN IF NOT EXISTS delivery_address_number text,
ADD COLUMN IF NOT EXISTS delivery_address_complement text,
ADD COLUMN IF NOT EXISTS delivery_address_neighborhood text,
ADD COLUMN IF NOT EXISTS delivery_address_city text,
ADD COLUMN IF NOT EXISTS delivery_address_state text,
ADD COLUMN IF NOT EXISTS delivery_address_notes text;

-- Make delivery_sequence nullable since we're not using it anymore
ALTER TABLE delivery_note_items 
ALTER COLUMN delivery_sequence DROP NOT NULL;