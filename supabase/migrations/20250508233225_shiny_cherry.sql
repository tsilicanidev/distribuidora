/*
  # Add selectedDueDateOption to delivery_note_items

  1. Changes
    - Add `selectedDueDateOption` column to `delivery_note_items` table
      - Type: text
      - Nullable: true
      - Purpose: Store the selected due date option for payment tracking

  2. Notes
    - This column will store values like '7days' or '7-14days'
    - Nullable to allow for orders without due date options
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_note_items' 
    AND column_name = 'selectedduedateoption'
  ) THEN
    ALTER TABLE delivery_note_items 
    ADD COLUMN selectedDueDateOption text;
  END IF;
END $$;