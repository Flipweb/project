/*
  # Fix Email Tracking RLS Policies

  1. Changes
    - Simplify RLS policies for email tracking
    - Allow anonymous inserts for registration events
    - Remove unnecessary restrictions

  2. Security
    - Maintain basic security while allowing registration flow
    - Keep service role access for administrative tasks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous registration" ON email_tracking_logs;
DROP POLICY IF EXISTS "Allow authenticated access" ON email_tracking_logs;
DROP POLICY IF EXISTS "Service role access" ON email_tracking_logs;

-- Allow inserts for registration events
CREATE POLICY "Allow registration events"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow users to read their own logs
CREATE POLICY "Allow users to read own logs"
  ON email_tracking_logs
  FOR SELECT
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  );

-- Allow users to update their own logs
CREATE POLICY "Allow users to update own logs"
  ON email_tracking_logs
  FOR UPDATE
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  )
  WITH CHECK (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  );

-- Allow users to delete their own logs
CREATE POLICY "Allow users to delete own logs"
  ON email_tracking_logs
  FOR DELETE
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  );

-- Service role has full access
CREATE POLICY "Service role full access"
  ON email_tracking_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);