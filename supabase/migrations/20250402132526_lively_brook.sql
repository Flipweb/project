/*
  # Fix Email Tracking RLS Policies

  1. Changes
    - Simplify RLS policies for email_tracking_logs
    - Remove complex metadata validation
    - Allow anonymous registration events without strict checks
    - Maintain basic security while fixing permission issues

  2. Security
    - Maintain RLS enabled
    - Keep service role access
    - Allow anonymous registration events
    - Allow authenticated users to manage their own logs
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous registration events" ON email_tracking_logs;
DROP POLICY IF EXISTS "Allow users to manage own logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Service role full access" ON email_tracking_logs;

-- Drop the validation function as it's no longer needed
DROP FUNCTION IF EXISTS public.validate_email_tracking_metadata;

-- Allow anonymous users to insert registration events with minimal restrictions
CREATE POLICY "Allow anonymous registration events"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event IN (
      'registration_started',
      'signup_failed',
      'signup_completed',
      'confirmation_email_requested',
      'confirmation_email_request_failed'
    )
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