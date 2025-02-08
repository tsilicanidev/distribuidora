-- Drop the username_login function
DROP FUNCTION IF EXISTS public.username_login(text, text);

-- Update admin user details
DO $$
DECLARE
  admin_id uuid;
  target_email text := 'tsilicani@gmail.com';
BEGIN
  -- First check if the target email already exists
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = target_email;

  IF admin_id IS NULL THEN
    -- If target email doesn't exist, get admin by role
    SELECT p.id INTO admin_id
    FROM profiles p
    WHERE p.role = 'admin'
    LIMIT 1;

    -- Update auth.users table only if we found an admin
    IF admin_id IS NOT NULL THEN
      UPDATE auth.users
      SET 
        email = target_email,
        encrypted_password = crypt('admin123', gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object(
          'full_name', 'Usuario Master'
        ),
        updated_at = now()
      WHERE id = admin_id;

      -- Update profiles table
      UPDATE profiles
      SET 
        name = 'Usuario Master',
        full_name = 'Usuario Master',
        updated_at = now()
      WHERE id = admin_id;
    END IF;
  ELSE
    -- If target email exists, just update the password and metadata
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin123', gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object(
        'full_name', 'Usuario Master'
      ),
      updated_at = now()
    WHERE id = admin_id;

    -- Update or insert the profile
    INSERT INTO profiles (id, name, full_name, role)
    VALUES (admin_id, 'Usuario Master', 'Usuario Master', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET 
      name = 'Usuario Master',
      full_name = 'Usuario Master',
      role = 'admin',
      updated_at = now();
  END IF;
END $$;