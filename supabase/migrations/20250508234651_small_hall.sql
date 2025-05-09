-- Add selectedDueDateOption column with proper case sensitivity
DO $$ 
BEGIN
  -- Check if the column exists with any case
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_note_items' 
    AND column_name ILIKE 'selectedduedateoption'
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
    -- First, identify the actual column name
    DECLARE
      actual_column_name text;
    BEGIN
      SELECT column_name INTO actual_column_name
      FROM information_schema.columns 
      WHERE table_name = 'delivery_note_items' 
      AND column_name ILIKE 'selectedduedateoption'
      LIMIT 1;
      
      EXECUTE format('ALTER TABLE delivery_note_items RENAME COLUMN %I TO "selectedDueDateOption"', actual_column_name);
    END;
  END IF;
END $$;