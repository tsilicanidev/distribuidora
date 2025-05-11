/*
  # Configure Auth Settings and CORS

  1. Changes
    - Add CORS configuration for Vercel domain
    - Set up proper auth settings for external access

  2. Security
    - Maintain existing security settings
    - Add only the specific Vercel domain
*/

-- Create a function to update auth settings
CREATE OR REPLACE FUNCTION update_auth_settings()
RETURNS void AS $$
BEGIN
  -- Update auth settings through Supabase's internal API
  PERFORM 
    set_config('supabase_auth.site_url', 'https://jpdistribuidora.vercel.app', false),
    set_config('supabase_auth.additional_redirect_urls', '["https://jpdistribuidora.vercel.app/**"]', false);
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_auth_settings();

-- Add CORS configuration
DO $$
BEGIN
  -- Create CORS table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.cors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    origin text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  -- Insert Vercel domain
  INSERT INTO public.cors (origin)
  VALUES ('https://jpdistribuidora.vercel.app')
  ON CONFLICT (origin) DO NOTHING;
END $$;