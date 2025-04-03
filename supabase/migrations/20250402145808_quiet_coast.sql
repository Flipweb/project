/*
  # Add user deletion permissions

  1. Changes
    - Add RLS policy for user deletion
    - Add cascade delete triggers for related tables
  
  2. Security
    - Enable service role to delete users and related data
    - Ensure referential integrity during deletion
*/

-- Add cascade delete trigger for email_logs
CREATE OR REPLACE FUNCTION clean_user_email_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM email_logs WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deletion_email_logs_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION clean_user_email_logs();

-- Add cascade delete trigger for email_tracking_logs
CREATE OR REPLACE FUNCTION clean_user_email_tracking_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM email_tracking_logs WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deletion_email_tracking_logs_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION clean_user_email_tracking_logs();

-- Grant delete permissions to service role
GRANT DELETE ON auth.users TO service_role;
GRANT DELETE ON email_logs TO service_role;
GRANT DELETE ON email_tracking_logs TO service_role;

-- Add RLS policies for deletion
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can delete email logs"
  ON email_logs
  FOR DELETE
  TO service_role
  USING (true);

ALTER TABLE email_tracking_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can delete email tracking logs"
  ON email_tracking_logs
  FOR DELETE
  TO service_role
  USING (true);