/*
  # Fix Token Validation Schema

  1. Changes
    - Add token column to customer_order_links
    - Add indexes for token lookup
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add policies for token access
*/

-- Add token column if it doesn't exist
ALTER TABLE customer_order_links 
ADD COLUMN IF NOT EXISTS token text;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_customer_order_links_token 
ON customer_order_links(token);

-- Enable RLS
ALTER TABLE customer_order_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active links" ON customer_order_links;
DROP POLICY IF EXISTS "Allow public token access" ON customer_order_links;

-- Create policies
CREATE POLICY "Anyone can read active links"
ON customer_order_links
FOR SELECT
TO anon, authenticated
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Allow public token access"
ON customer_order_links
FOR SELECT
TO public
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
);