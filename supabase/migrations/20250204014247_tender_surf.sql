-- Drop existing foreign key constraint
ALTER TABLE stock_movements
DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey;

-- Add new foreign key constraint with cascade delete
ALTER TABLE stock_movements
ADD CONSTRAINT stock_movements_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;

-- Drop existing foreign key constraint on invoice_items
ALTER TABLE invoice_items
DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;

-- Add new foreign key constraint with cascade delete on invoice_items
ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;

-- Drop existing foreign key constraint on fiscal_invoice_items
ALTER TABLE fiscal_invoice_items
DROP CONSTRAINT IF EXISTS fiscal_invoice_items_product_id_fkey;

-- Add new foreign key constraint with cascade delete on fiscal_invoice_items
ALTER TABLE fiscal_invoice_items
ADD CONSTRAINT fiscal_invoice_items_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;

-- Drop existing foreign key constraint on delivery_note_items
ALTER TABLE delivery_note_items
DROP CONSTRAINT IF EXISTS delivery_note_items_product_id_fkey;

-- Add new foreign key constraint with cascade delete on delivery_note_items
ALTER TABLE delivery_note_items
ADD CONSTRAINT delivery_note_items_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;