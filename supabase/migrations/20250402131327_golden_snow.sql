/*
  # Add email tracking system

  1. New Tables
    - `email_tracking_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text)
      - `event` (text) - тип события (registration_started, signup_completed, email_requested, etc)
      - `status` (text) - статус события (success, error, pending)
      - `metadata` (jsonb) - дополнительные данные о событии
      - `error` (text) - описание ошибки, если есть
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `email_tracking_logs` table
    - Add policies for authenticated users and service role
*/

CREATE TABLE IF NOT EXISTS email_tracking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  event text NOT NULL,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_tracking_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage all logs"
  ON email_tracking_logs
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Users can read their own logs"
  ON email_tracking_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create index for faster queries
CREATE INDEX idx_email_tracking_logs_user_email 
  ON email_tracking_logs(user_id, email);

CREATE INDEX idx_email_tracking_logs_event_status 
  ON email_tracking_logs(event, status);