/*
  # Authentication Policies Update

  1. Changes
    - Add policies for service role to manage user authentication
    - Set up proper permissions for email template management
    - Ensure proper user data access control

  2. Security
    - Enable service role to manage user data
    - Allow service role to handle email templates
*/

-- Create policy for service role to manage user data
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'users' 
    AND policyname = 'Service role can manage users'
  ) THEN
    CREATE POLICY "Service role can manage users"
      ON auth.users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create policy for service role to manage email templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'mfa_factors' 
    AND policyname = 'Service role can manage email templates'
  ) THEN
    CREATE POLICY "Service role can manage email templates"
      ON auth.mfa_factors
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Drop and recreate policies for email logs if they don't exist
DO $$ 
BEGIN
  -- Users read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'email_logs' 
    AND policyname = 'Users can read their own email logs'
  ) THEN
    CREATE POLICY "Users can read their own email logs"
      ON email_logs
      FOR SELECT
      TO authenticated
      USING (
        recipient = auth.jwt()->>'email' OR
        user_id = auth.uid()
      );
  END IF;

  -- Users insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'email_logs' 
    AND policyname = 'Users can insert their own email logs'
  ) THEN
    CREATE POLICY "Users can insert their own email logs"
      ON email_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id
      );
  END IF;
END $$;