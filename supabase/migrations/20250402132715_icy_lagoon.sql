/*
  # Simplify Email Tracking System

  1. Changes
    - Simplify RLS policies
    - Remove complex metadata validation
    - Keep basic tracking functionality

  2. Security
    - Maintain RLS enabled
    - Keep basic security policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous registration events" ON email_tracking_logs;
DROP POLICY IF EXISTS "Allow users to manage own logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Service role full access" ON email_tracking_logs;

-- Simple policy for anonymous registration
CREATE POLICY "Allow anonymous registration"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Simple policy for authenticated users
CREATE POLICY "Allow authenticated access"
  ON email_tracking_logs
  FOR ALL
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    user_id = auth.uid()
  );

-- Service role access
CREATE POLICY "Service role access"
  ON email_tracking_logs
  FOR ALL
  TO service_role
  USING (true);