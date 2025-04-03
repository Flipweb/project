/*
  # Fix users table access and email tracking policies

  1. Changes
    - Add policy for reading user emails
    - Update email tracking policies to avoid direct users table access
    - Simplify email tracking checks
  
  2. Security
    - Maintain RLS
    - Allow controlled access to user emails
    - Prevent unauthorized access
*/

-- Create a secure function to check user email
CREATE OR REPLACE FUNCTION public.check_user_email(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = check_email 
    AND id = auth.uid()
  );
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow registration logging" ON email_tracking_logs;
DROP POLICY IF EXISTS "Users can read own logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON email_tracking_logs;

-- Create new policies using the secure function
CREATE POLICY "Allow registration logging"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL AND event = 'registration_started') OR
    (auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      check_user_email(email)
    ))
  );

CREATE POLICY "Users can read own logs"
  ON email_tracking_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    check_user_email(email)
  );

CREATE POLICY "Users can insert own logs"
  ON email_tracking_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    check_user_email(email)
  );