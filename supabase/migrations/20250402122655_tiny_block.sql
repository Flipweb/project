/*
  # Update Email Logs Policies

  1. Changes
    - Add policy for authenticated users to insert their own email logs
    - Add policy for service role to manage all email logs
    - Add user_id column to email_logs table for better RLS control

  2. Security
    - Maintain existing RLS policies
    - Add new policies for insert operations
    - Link email logs to authenticated users
*/

-- Add user_id column to email_logs
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create policy for authenticated users to insert their own logs
CREATE POLICY "Users can insert their own email logs"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Update existing select policy
DROP POLICY IF EXISTS "Users can read their own email logs" ON email_logs;
CREATE POLICY "Users can read their own email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    recipient = auth.jwt()->>'email' OR
    user_id = auth.uid()
  );

-- Create policy for service role to manage all logs
CREATE POLICY "Service role can manage all email logs"
  ON email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);