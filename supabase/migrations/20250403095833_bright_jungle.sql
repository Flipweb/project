/*
  # Fix Email Template Function

  1. Changes
    - Drop and recreate get_template function with proper schema reference
    - Add proper error handling
    - Fix return type to match password-recovery function expectations
  
  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing permissions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS emails.get_template;

-- Recreate the function with proper schema reference and return type
CREATE OR REPLACE FUNCTION get_template(template_type email_template_type)
RETURNS TABLE (
  subject text,
  content text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.subject, t.content
  FROM emails.templates t
  WHERE t.type = template_type
  AND t.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found for type: %', template_type;
  END IF;
END;
$$;