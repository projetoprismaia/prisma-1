/*
  # Add WhatsApp field to profiles

  1. Changes
    - Add `whatsapp` column to `profiles` table
    - Column is optional (nullable) text field
  
  2. Security
    - No changes to existing RLS policies needed
    - WhatsApp field follows same access patterns as other profile fields
*/

-- Add whatsapp column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp text;
  END IF;
END $$;