-- Add payment_method and due_date columns to sales_orders if they don't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Add weight column to sales_order_items if it doesn't exist
ALTER TABLE sales_order_items
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0;