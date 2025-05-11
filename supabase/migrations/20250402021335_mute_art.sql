/*
  # Add delivery_address to delivery_note_items table
  
  1. Changes
    - Add delivery_address column to delivery_note_items table
    - This allows specifying custom delivery addresses for each order
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add delivery_address column if it doesn't exist
ALTER TABLE delivery_note_items 
ADD COLUMN IF NOT EXISTS delivery_address text;