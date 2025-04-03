/*
  # Add Email Templates and Tracking System

  1. New Tables
    - `email_templates` for storing email templates
    - Add template tracking to email_tracking_logs
  
  2. Changes
    - Add template_type enum
    - Add template validation function
    - Add delivery tracking improvements
    - Add template management functions
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS emails;

-- Create enum for email template types
CREATE TYPE email_template_type AS ENUM (
  'signup',
  'invite',
  'magic_link',
  'recovery',
  'email_change',
  'confirmation'
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS emails.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type email_template_type NOT NULL UNIQUE,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  version text DEFAULT '1.0',
  is_active boolean DEFAULT true
);

-- Create function to validate email template
CREATE OR REPLACE FUNCTION emails.validate_template(template jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    template ? 'subject' AND
    template ? 'content' AND
    template->>'subject' IS NOT NULL AND
    template->>'content' IS NOT NULL
  );
END;
$$;

-- Update email tracking to include template info
ALTER TABLE email_tracking_logs
ADD COLUMN IF NOT EXISTS template_type email_template_type,
ADD COLUMN IF NOT EXISTS template_version text,
ADD COLUMN IF NOT EXISTS delivery_attempts int DEFAULT 0;

-- Add index for template tracking
CREATE INDEX IF NOT EXISTS idx_email_tracking_template 
ON email_tracking_logs(template_type, status);

-- Function to track email delivery attempts
CREATE OR REPLACE FUNCTION emails.track_delivery()
RETURNS trigger AS $$
BEGIN
  -- Increment delivery attempts
  NEW.delivery_attempts := COALESCE(OLD.delivery_attempts, 0) + 1;
  
  -- Update status based on attempts
  IF NEW.delivery_attempts >= 3 AND NEW.status = 'error' THEN
    NEW.status := 'failed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking delivery attempts
DROP TRIGGER IF EXISTS email_delivery_tracking ON email_tracking_logs;
CREATE TRIGGER email_delivery_tracking
  BEFORE UPDATE ON email_tracking_logs
  FOR EACH ROW
  WHEN (NEW.status = 'error')
  EXECUTE FUNCTION emails.track_delivery();

-- Add default templates
INSERT INTO emails.templates (type, subject, content, version)
VALUES
  (
    'recovery',
    'Восстановление пароля в Контур',
    '<h2>Восстановление пароля</h2><p>Для создания нового пароля перейдите по ссылке:</p><p><a href="{{ .ConfirmationURL }}">Восстановить пароль</a></p><p>Если вы не запрашивали восстановление пароля, просто игнорируйте это письмо.</p><p>С уважением,<br>Команда Контур</p>',
    '1.0'
  ),
  (
    'signup',
    'Добро пожаловать в Контур',
    '<h2>Добро пожаловать в Контур!</h2><p>Для подтверждения email адреса перейдите по ссылке:</p><p><a href="{{ .ConfirmationURL }}">Подтвердить email</a></p><p>С уважением,<br>Команда Контур</p>',
    '1.0'
  )
ON CONFLICT (type) DO UPDATE
SET 
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  version = EXCLUDED.version,
  updated_at = now();

-- Function to get email template
CREATE OR REPLACE FUNCTION emails.get_template(template_type email_template_type)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_record emails.templates%ROWTYPE;
BEGIN
  SELECT * INTO template_record
  FROM emails.templates
  WHERE type = template_type
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'subject', template_record.subject,
    'content', template_record.content,
    'version', template_record.version
  );
END;
$$;

-- Enable RLS
ALTER TABLE emails.templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Service role can manage templates"
  ON emails.templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA emails TO service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA emails TO service_role;
GRANT SELECT ON emails.templates TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA emails TO service_role, anon, authenticated;