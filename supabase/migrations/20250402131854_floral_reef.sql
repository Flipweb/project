/*
  # Fix email tracking RLS policies

  1. Changes
    - Drop existing policies
    - Add new simplified policies for registration flow
    - Fix anonymous access for registration events
  
  2. Security
    - Allow anonymous users to log registration events
    - Maintain secure access for authenticated users
    - Keep service role access for administration
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous registration" ON email_tracking_logs;
DROP POLICY IF EXISTS "Allow authenticated access" ON email_tracking_logs;
DROP POLICY IF EXISTS "Service role full access" ON email_tracking_logs;

-- Allow anonymous users to insert registration events
CREATE POLICY "Allow anonymous registration events"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event IN ('registration_started', 'signup_failed') AND
    user_id IS NULL
  );

-- Allow authenticated users to manage their own logs
CREATE POLICY "Allow users to manage own logs"
  ON email_tracking_logs
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN auth.jwt() ->> 'email' IS NOT NULL THEN
        email = auth.jwt() ->> 'email'
      ELSE
        user_id = auth.uid()
    END
  )
  WITH CHECK (
    CASE
      WHEN auth.jwt() ->> 'email' IS NOT NULL THEN
        email = auth.jwt() ->> 'email'
      ELSE
        user_id = auth.uid()
    END
  );

-- Service role has full access
CREATE POLICY "Service role full access"
  ON email_tracking_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);