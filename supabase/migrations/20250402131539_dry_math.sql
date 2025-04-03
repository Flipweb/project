/*
  # Fix email tracking RLS policies

  1. Changes
    - Add policy for unauthenticated inserts during registration
    - Add policy for authenticated users to insert their own logs
    - Update read policy to be more secure
  
  2. Security
    - Maintain RLS
    - Allow controlled access for registration process
    - Ensure users can only read their own logs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage all logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Users can read their own logs" ON email_tracking_logs;

-- Create new policies
CREATE POLICY "Service role can manage all logs"
  ON email_tracking_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow inserts during registration (when user_id is null)
CREATE POLICY "Allow registration logging"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL AND event = 'registration_started') OR
    (auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ))
  );

-- Allow users to read their own logs
CREATE POLICY "Users can read own logs"
  ON email_tracking_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow users to insert their own logs
CREATE POLICY "Users can insert own logs"
  ON email_tracking_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );