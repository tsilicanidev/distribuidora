/*
  # Add Indexes and Constraints

  1. Indexes
    - Add unique index on profiles(email)
    - Add index on profiles(role)
    - Add index on profiles(created_at)

  2. Constraints
    - Add role validation check constraint
    - Add email format check constraint
*/

-- Add unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add index on role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add index on created_at
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Add role validation check constraint
DO $$ 
BEGIN
  ALTER TABLE profiles 
    ADD CONSTRAINT check_valid_role 
    CHECK (role IN ('admin', 'manager', 'seller', 'driver', 'warehouse'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add email format check constraint
DO $$ 
BEGIN
  ALTER TABLE profiles 
    ADD CONSTRAINT check_valid_email 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add RLS policies for admin operations
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow admin operations" ON profiles;
  
  CREATE POLICY "Allow admin operations"
    ON profiles
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
END $$;