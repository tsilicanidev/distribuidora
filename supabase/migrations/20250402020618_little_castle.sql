/*
  # Fix delivery_note_items relationship with sales_orders
  
  1. Changes
    - Add foreign key constraint between delivery_note_items and sales_orders
    - Ensure order_id column exists and is properly configured
  
  2. Security
    - Maintain existing RLS policies
*/

-- First check if the order_id column exists in delivery_note_items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'delivery_note_items' 
    AND column_name = 'order_id'
  ) THEN
    -- Add order_id column if it doesn't exist
    ALTER TABLE delivery_note_items 
    ADD COLUMN order_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'delivery_note_items'
    AND ccu.table_name = 'sales_orders'
    AND ccu.column_name = 'id'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE delivery_note_items
    ADD CONSTRAINT fk_delivery_note_items_order
    FOREIGN KEY (order_id)
    REFERENCES sales_orders(id);
  END IF;
END $$;

-- Make sure the order_id column is NOT NULL
ALTER TABLE delivery_note_items
ALTER COLUMN order_id SET NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_order ON delivery_note_items(order_id);