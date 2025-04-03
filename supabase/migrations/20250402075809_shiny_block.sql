/*
  # Email Monitoring System Schema

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `email_id` (text, unique identifier for the email)
      - `recipient` (text, email recipient)
      - `type` (text, email event type)
      - `status` (text, delivery status)
      - `error` (text, error message if any)
      - `timestamp` (timestamptz, when the event occurred)
      - `created_at` (timestamptz, when the record was created)

  2. Security
    - Enable RLS on `email_logs` table
    - Add policy for authenticated users to read their own data
    - Add policy for service role to insert logs
*/

-- Create enum for email event types
CREATE TYPE email_event_type AS ENUM (
  'sent',
  'delivered',
  'bounced',
  'failed'
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id text NOT NULL,
  recipient text NOT NULL,
  type email_event_type NOT NULL,
  status text NOT NULL,
  error text,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_timestamp ON email_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs (type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs (recipient);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (recipient = auth.jwt()->>'email');

CREATE POLICY "Service role can insert email logs"
  ON email_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create view for daily statistics
CREATE OR REPLACE VIEW email_daily_stats AS
SELECT
  date_trunc('day', timestamp) AS day,
  type,
  COUNT(*) as count
FROM email_logs
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Function to get email delivery stats for a date range
CREATE OR REPLACE FUNCTION get_email_stats(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  total_sent bigint,
  total_delivered bigint,
  total_bounced bigint,
  total_failed bigint,
  delivery_rate numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE type = 'sent') as sent,
      COUNT(*) FILTER (WHERE type = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE type = 'bounced') as bounced,
      COUNT(*) FILTER (WHERE type = 'failed') as failed
    FROM email_logs
    WHERE timestamp BETWEEN start_date AND end_date
  )
  SELECT
    sent as total_sent,
    delivered as total_delivered,
    bounced as total_bounced,
    failed as total_failed,
    CASE 
      WHEN sent = 0 THEN 0
      ELSE ROUND((delivered::numeric / sent::numeric) * 100, 2)
    END as delivery_rate
  FROM stats;
END;
$$;