/*
  # Fix User Deletion

  1. Changes
    - Add missing permissions for user deletion
    - Add cascade delete triggers for all user-related data
    - Update RLS policies
  
  2. Security
    - Ensure proper cleanup of user data
    - Maintain referential integrity
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS user_deletion_email_logs_trigger ON auth.users;
DROP TRIGGER IF EXISTS user_deletion_email_tracking_logs_trigger ON auth.users;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS clean_user_email_logs();
DROP FUNCTION IF EXISTS clean_user_email_tracking_logs();

-- Recreate the cleanup functions with better error handling
CREATE OR REPLACE FUNCTION clean_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related records from email_logs
  DELETE FROM email_logs WHERE user_id = OLD.id;
  
  -- Delete related records from email_tracking_logs
  DELETE FROM email_tracking_logs WHERE user_id = OLD.id;
  
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error cleaning up user data: %', SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a single trigger for all user data cleanup
CREATE TRIGGER user_deletion_cleanup_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION clean_user_data();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT, DELETE ON auth.users TO service_role;
GRANT DELETE ON email_logs TO service_role;
GRANT DELETE ON email_tracking_logs TO service_role;

-- Update RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can delete email logs" ON email_logs;
CREATE POLICY "Service role can delete email logs"
  ON email_logs
  FOR DELETE
  TO service_role
  USING (true);

ALTER TABLE email_tracking_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can delete email tracking logs" ON email_tracking_logs;
CREATE POLICY "Service role can delete email tracking logs"
  ON email_tracking_logs
  FOR DELETE
  TO service_role
  USING (true);

-- Add indexes to improve deletion performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_logs_user_id ON email_tracking_logs(user_id);