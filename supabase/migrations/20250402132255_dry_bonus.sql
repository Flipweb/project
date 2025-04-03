/*
  # Update RLS policies for email tracking logs

  1. Changes
    - Add explicit timestamp validation in metadata
    - Improve registration event handling
    - Add support for all registration-related events
    - Ensure metadata contains required fields

  2. Security
    - Maintain strict RLS policies
    - Allow anonymous registration events with proper validation
    - Ensure authenticated users can only access their own logs
    - Service role maintains full access
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous registration events" ON email_tracking_logs;
DROP POLICY IF EXISTS "Allow users to manage own logs" ON email_tracking_logs;
DROP POLICY IF EXISTS "Service role full access" ON email_tracking_logs;

-- Allow anonymous and authenticated users to insert registration events
CREATE POLICY "Allow anonymous registration events"
  ON email_tracking_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Allow specific registration-related events
    event IN (
      'registration_started',
      'signup_failed',
      'signup_completed',
      'confirmation_email_requested',
      'confirmation_email_request_failed'
    ) AND
    -- Ensure user_id is null for initial registration events
    CASE 
      WHEN event IN ('registration_started', 'signup_failed') THEN
        user_id IS NULL
      ELSE
        TRUE
    END AND
    -- Validate metadata structure
    metadata IS NOT NULL AND
    metadata ? 'timestamp' AND
    (metadata ->> 'timestamp')::timestamptz IS NOT NULL AND
    metadata ? 'source' AND
    metadata ->> 'source' = 'web'
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

-- Add function to validate email tracking log metadata
CREATE OR REPLACE FUNCTION public.validate_email_tracking_metadata(metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    metadata IS NOT NULL AND
    metadata ? 'timestamp' AND
    metadata ? 'source' AND
    -- Validate timestamp format
    (metadata ->> 'timestamp')::timestamptz IS NOT NULL AND
    -- Validate source
    metadata ->> 'source' = 'web'
  );
END;
$$;