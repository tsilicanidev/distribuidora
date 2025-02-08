-- Remove username column and constraints from profiles
DO $$ 
BEGIN
  -- Drop the username format constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'username_format' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT username_format;
  END IF;

  -- Drop the username column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles DROP COLUMN username;
  END IF;
END $$;

-- Update profiles table constraints
DO $$
BEGIN
  -- Drop the full_name_format constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'full_name_format' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT full_name_format;
  END IF;

  -- Add the NOT NULL constraint if it doesn't exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'full_name' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN full_name SET NOT NULL;
  END IF;

  -- Add the new constraint
  ALTER TABLE profiles ADD CONSTRAINT full_name_format 
    CHECK (full_name ~ '^[a-zA-ZÀ-ÿ\s]{2,100}$');
END $$;

-- Create master admin user
DO $$
DECLARE
  admin_id uuid;
  admin_email text := 'tsilicani@gmail.com';
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    
    -- Insert admin user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    )
    VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Usuario Master"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );

    -- Insert admin profile
    INSERT INTO profiles (id, full_name, role)
    VALUES (admin_id, 'Usuario Master', 'admin');
  ELSE
    -- Update existing admin user
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = '{"full_name":"Usuario Master"}',
      updated_at = now()
    WHERE id = admin_id;

    -- Update admin profile
    UPDATE profiles
    SET 
      full_name = 'Usuario Master',
      role = 'admin',
      updated_at = now()
    WHERE id = admin_id;
  END IF;
END $$;