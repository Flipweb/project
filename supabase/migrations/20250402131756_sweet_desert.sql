/*
  # Fix email tracking policies

  1. Changes
    - Simplify RLS policies for email tracking
    - Allow anonymous registration logging
    - Fix user access permissions
  
  2. Security
    - Maintain RLS protection
    - Allow registration events without authentication
    - Secure user data access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage all logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Allow registration logging" ON email_tracking_logs;
DROP POLICY IF EXISTS "Users can read own logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON email_tracking_logs;

-- Create simplified policies
CREATE POLICY "Allow anonymous registration"
  ON email_tracking_logs
  FOR INSERT
  TO anon
  WITH CHECK (
    event = 'registration_started' AND
    user_id IS NULL
  );

CREATE POLICY "Allow authenticated access"
  ON email_tracking_logs
  FOR ALL
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  )
  WITH CHECK (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  );

CREATE POLICY "Service role full access"
  ON email_tracking_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);