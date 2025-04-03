/*
  # Fix User Deletion with Cascade

  1. Changes
    - Drop existing triggers first
    - Drop existing functions
    - Add cascade delete constraints
    - Update permissions for service role
    - Ensure proper cleanup order
  
  2. Security
    - Maintain data integrity during deletion
    - Proper permission structure
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS tr_clean_user_data ON auth.users;
DROP TRIGGER IF EXISTS user_deletion_cleanup_trigger ON auth.users;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS clean_user_data();

-- First, drop existing foreign key constraints
ALTER TABLE email_logs 
  DROP CONSTRAINT IF EXISTS email_logs_user_id_fkey;

ALTER TABLE email_tracking_logs 
  DROP CONSTRAINT IF EXISTS email_tracking_logs_user_id_fkey;

-- Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE email_logs
  ADD CONSTRAINT email_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE email_tracking_logs
  ADD CONSTRAINT email_tracking_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Ensure proper permissions
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT, DELETE ON auth.users TO service_role;
GRANT DELETE ON email_logs TO service_role;
GRANT DELETE ON email_tracking_logs TO service_role;

-- Update RLS policies to ensure service role can delete
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can delete email logs" ON email_logs;
CREATE POLICY "Service role can delete email logs"
  ON email_logs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE email_tracking_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can delete email tracking logs" ON email_tracking_logs;
CREATE POLICY "Service role can delete email tracking logs"
  ON email_tracking_logs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_logs_user_id ON email_tracking_logs(user_id);