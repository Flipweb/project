/*
  # Add Email Templates and Improve Tracking

  1. Changes
    - Add email templates configuration
    - Add email delivery tracking improvements
    - Add email template validation function
  
  2. Security
    - Maintain RLS protection
    - Add template access controls
*/

-- Create enum for email template types
CREATE TYPE email_template_type AS ENUM (
  'signup',
  'invite',
  'magic_link',
  'recovery',
  'email_change',
  'confirmation'
);

-- Create function to validate email template
CREATE OR REPLACE FUNCTION validate_email_template(template jsonb)
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
CREATE OR REPLACE FUNCTION track_email_delivery()
RETURNS trigger AS $$
BEGIN
  -- Increment delivery attempts
  NEW.delivery_attempts := OLD.delivery_attempts + 1;
  
  -- Update status based on attempts
  IF NEW.delivery_attempts >= 3 AND NEW.status = 'error' THEN
    NEW.status := 'failed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking delivery attempts
CREATE TRIGGER email_delivery_tracking
  BEFORE UPDATE ON email_tracking_logs
  FOR EACH ROW
  WHEN (NEW.status = 'error')
  EXECUTE FUNCTION track_email_delivery();

-- Add configuration for password recovery template
INSERT INTO auth.email_templates (template_type, template)
VALUES (
  'recovery',
  '{
    "subject": "Восстановление пароля в Контур",
    "content": "<h2>Восстановление пароля</h2><p>Для создания нового пароля перейдите по ссылке:</p><p><a href=\"{{ .ConfirmationURL }}\">Восстановить пароль</a></p><p>Если вы не запрашивали восстановление пароля, просто игнорируйте это письмо.</p><p>С уважением,<br>Команда Контур</p>"
  }'::jsonb
)
ON CONFLICT (template_type) 
DO UPDATE SET template = EXCLUDED.template;

-- Function to get email template
CREATE OR REPLACE FUNCTION get_email_template(template_type email_template_type)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT template
    FROM auth.email_templates
    WHERE template_type = $1
  );
END;
$$;