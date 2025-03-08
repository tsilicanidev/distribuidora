/*
  # Configure CORS and Auth Settings
  
  1. Changes
    - Add CORS configuration for the application domain
    - Create table for managing allowed origins if it doesn't exist
  
  2. Security
    - Ensure proper CORS configuration
    - Maintain list of allowed origins
*/

-- Create CORS table if it doesn't exist
CREATE TABLE IF NOT EXISTS cors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cors ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read CORS settings
CREATE POLICY "Allow authenticated users to read CORS settings"
  ON cors
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow admins to manage CORS settings
CREATE POLICY "Allow admins to manage CORS settings"
  ON cors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert allowed origins
INSERT INTO cors (origin)
VALUES 
  ('https://jpdistribuidora.vercel.app'),
  ('http://localhost:5173'),
  ('http://localhost:3000')
ON CONFLICT (origin) DO NOTHING;

-- Create index on origin
CREATE INDEX IF NOT EXISTS idx_cors_origin ON cors(origin);

-- Add comment to table
COMMENT ON TABLE cors IS 'Table for managing CORS allowed origins';