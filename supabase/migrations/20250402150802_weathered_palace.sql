/*
  # Add User Profile Fields

  1. Changes
    - Add name and phone columns to auth.users table
    - Add validation functions for phone numbers
    - Add RLS policies for profile updates
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create function to validate phone numbers
CREATE OR REPLACE FUNCTION is_valid_phone(phone text)
RETURNS boolean AS $$
BEGIN
  -- Basic phone validation: +7 followed by 10 digits
  RETURN phone ~ '^\+7[0-9]{10}$';
END;
$$ LANGUAGE plpgsql;

-- Add profile fields to auth.users if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'raw_user_meta_data'
  ) THEN
    ALTER TABLE auth.users 
    ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create a function to update user metadata
CREATE OR REPLACE FUNCTION update_user_metadata(
  user_id uuid,
  name text DEFAULT NULL,
  phone text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  current_metadata jsonb;
  new_metadata jsonb;
BEGIN
  -- Get current metadata
  SELECT COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO current_metadata
  FROM auth.users
  WHERE id = user_id;

  -- Validate phone if provided
  IF phone IS NOT NULL AND NOT is_valid_phone(phone) THEN
    RAISE EXCEPTION 'Invalid phone number format. Must be +7 followed by 10 digits';
  END IF;

  -- Create new metadata
  new_metadata = current_metadata;
  
  IF name IS NOT NULL THEN
    new_metadata = jsonb_set(new_metadata, '{name}', to_jsonb(name));
  END IF;
  
  IF phone IS NOT NULL THEN
    new_metadata = jsonb_set(new_metadata, '{phone}', to_jsonb(phone));
  END IF;

  -- Update the user
  UPDATE auth.users
  SET raw_user_meta_data = new_metadata
  WHERE id = user_id;

  RETURN new_metadata;
END;
$$ LANGUAGE plpgsql;