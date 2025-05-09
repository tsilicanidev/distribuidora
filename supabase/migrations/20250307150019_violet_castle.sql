/*
  # Configure CORS and Auth Settings
  
  1. Changes
    - Add allowed CORS origins
    - Configure auth settings
  
  2. Security
    - Restrict CORS to specific domains
    - Configure secure auth settings
*/

-- Insert CORS configuration
INSERT INTO cors (origin)
VALUES ('https://jpdistribuidora.vercel.app')
ON CONFLICT (origin) DO NOTHING;

-- Create auth settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  additional_redirect_urls text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Only admins can manage auth settings" ON auth_settings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Insert or update auth settings
INSERT INTO auth_settings (site_url, additional_redirect_urls)
VALUES (
  'https://jpdistribuidora.vercel.app',
  ARRAY['https://jpdistribuidora.vercel.app/**']
)
ON CONFLICT (id) DO UPDATE
SET 
  site_url = EXCLUDED.site_url,
  additional_redirect_urls = EXCLUDED.additional_redirect_urls,
  updated_at = now();

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_auth_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_settings_updated_at
  BEFORE UPDATE ON auth_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auth_settings_updated_at();

-- Add comments
COMMENT ON TABLE auth_settings IS 'Stores authentication configuration settings';
COMMENT ON COLUMN auth_settings.site_url IS 'Base URL for authentication redirects';
COMMENT ON COLUMN auth_settings.additional_redirect_urls IS 'Additional allowed redirect URLs';