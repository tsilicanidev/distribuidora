-- Add URL columns to fiscal_invoices if they don't exist
ALTER TABLE fiscal_invoices 
ADD COLUMN IF NOT EXISTS xml_url text,
ADD COLUMN IF NOT EXISTS pdf_url text;