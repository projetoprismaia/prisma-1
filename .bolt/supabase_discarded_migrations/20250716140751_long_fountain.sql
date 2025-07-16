/*
  # Fix RLS infinite recursion in profiles table

  1. Problem
    - Current policies create infinite recursion by checking profiles table from within profiles policies
    - Admin policies try to check user role from profiles table while being applied to profiles table

  2. Solution
    - Remove recursive policies that reference profiles table from within profiles policies
    - Use direct auth.uid() checks instead of complex role-based checks
    - Simplify policies to avoid circular dependencies

  3. Changes
    - Drop all existing policies
    - Create simple, non-recursive policies
    - Use auth.uid() directly without referencing profiles table
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Removed admin policies that were causing recursion
-- Admin functionality can be handled at the application level if needed