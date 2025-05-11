/*
  # Add Error Logs Table

  1. New Tables
    - `error_logs`
      - `id` (uuid, primary key)
      - `error_type` (text)
      - `message` (text)
      - `stack` (text)
      - `context` (jsonb)
      - `user_id` (uuid)
      - `customer_id` (uuid)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for error logging
*/

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  message text NOT NULL,
  stack text,
  context jsonb,
  user_id uuid REFERENCES auth.users(id),
  customer_id uuid REFERENCES customers(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_customer ON error_logs(customer_id);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow insert for all" ON error_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow select for authenticated users" ON error_logs
  FOR SELECT
  TO authenticated
  USING (true);