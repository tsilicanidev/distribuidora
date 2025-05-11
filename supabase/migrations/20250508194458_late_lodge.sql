/*
  # Fix sales_orders seller_id constraint
  
  1. Changes
    - Modify the foreign key constraint on sales_orders.seller_id to allow NULL values
    - This allows deleting users who have created sales orders
    
  2. Security
    - Maintains data integrity while allowing user management
*/

-- First, drop the existing constraint
ALTER TABLE sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_seller_id_fkey;

-- Then recreate it with ON DELETE SET NULL
ALTER TABLE sales_orders
ADD CONSTRAINT sales_orders_seller_id_fkey
FOREIGN KEY (seller_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT sales_orders_seller_id_fkey ON sales_orders IS 
'Foreign key to profiles table with ON DELETE SET NULL to allow deleting users who have created orders';