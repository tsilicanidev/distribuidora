-- Add XML and PDF URLs to fiscal_invoices table
ALTER TABLE fiscal_invoices
ADD COLUMN IF NOT EXISTS xml_url text,
ADD COLUMN IF NOT EXISTS pdf_url text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_number ON fiscal_invoices(number);