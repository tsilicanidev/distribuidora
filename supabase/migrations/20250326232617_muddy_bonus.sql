/*
  # Add Unit Field to Products Table
  
  1. Changes
    - Add unit field to products table
    - Add check constraint for valid units
    - Update existing products to use default unit
*/

-- Add unit column with check constraint
ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'UN'
CHECK (unit IN ('UN', 'CX', 'KG', 'L', 'PCT', 'FD'));

-- Add comment to explain units
COMMENT ON COLUMN products.unit IS 'Product unit (UN=Unit, CX=Box, KG=Kilogram, L=Liter, PCT=Package, FD=Bundle)';