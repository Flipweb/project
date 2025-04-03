/*
  # User Deletion Fix

  1. Changes
    - Add cascade delete trigger for user data cleanup
    - Add policy for service role to delete users
    - Add policy for service role to manage user data
    - Add cleanup function for user data

  2. Security
    - Ensure proper permissions for service role
    - Maintain data integrity during deletion
*/

-- Create function to clean up user data
CREATE OR REPLACE FUNCTION clean_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user's email logs
  DELETE FROM public.email_logs
  WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger for user deletion cleanup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'tr_clean_user_data'
  ) THEN
    CREATE TRIGGER tr_clean_user_data
      BEFORE DELETE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION clean_user_data();
  END IF;
END $$;

-- Ensure service role has proper permissions
DO $$
BEGIN
  -- Grant delete permission on auth.users
  ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'users' 
    AND policyname = 'Service role can delete users'
  ) THEN
    CREATE POLICY "Service role can delete users"
      ON auth.users
      FOR DELETE
      TO service_role
      USING (true);
  END IF;

  -- Grant usage on auth schema
  GRANT USAGE ON SCHEMA auth TO service_role;
  
  -- Grant delete on auth.users
  GRANT DELETE ON auth.users TO service_role;
END $$;