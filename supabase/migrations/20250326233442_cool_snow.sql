-- Add discount fields to sales_orders table
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS subtotal_amount numeric DEFAULT 0 CHECK (subtotal_amount >= 0),
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0);