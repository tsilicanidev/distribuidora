/*
  # Add NFe URL columns to fiscal_invoices table

  1. Changes
    - Add xml_url column for storing XML document URL
    - Add pdf_url column for storing PDF document URL
    
  2. Description
    - These columns store the URLs for the generated NFe documents
    - Used when approving orders and generating fiscal documents
*/

-- Add URL columns to fiscal_invoices if they don't exist
ALTER TABLE fiscal_invoices 
ADD COLUMN IF NOT EXISTS xml_url text,
ADD COLUMN IF NOT EXISTS pdf_url text;