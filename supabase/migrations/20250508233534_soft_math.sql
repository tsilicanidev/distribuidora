/*
  # Fix selectedDueDateOption column in delivery_note_items
  
  1. Changes
    - Add selectedDueDateOption column if it doesn't exist
    - Ensure column name has correct case sensitivity
  
  2. Description
    - Fixes error when querying for selectedDueDateOption column
    - Maintains existing data
*/

-- Add selectedDueDateOption column if it doesn't exist (case-sensitive)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_note_items' 
    AND column_name = 'selectedduedateoption'
  ) THEN
    -- Column doesn't exist at all, add it
    ALTER TABLE delivery_note_items 
    ADD COLUMN "selectedDueDateOption" text;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_note_items' 
    AND column_name = 'selectedDueDateOption'
  ) THEN
    -- Column exists but with wrong case, rename it
    ALTER TABLE delivery_note_items 
    RENAME COLUMN selectedduedateoption TO "selectedDueDateOption";
  END IF;
END $$;