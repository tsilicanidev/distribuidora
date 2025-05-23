-- Add box_weight column to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS box_weight numeric;

-- Add comment to explain the column
COMMENT ON COLUMN products.box_weight IS 'Weight of a box in kilograms, used for products with unit type CX';

-- Create index for better performance when querying by box weight
CREATE INDEX IF NOT EXISTS idx_products_box_weight ON products(box_weight) 
WHERE box_weight IS NOT NULL;