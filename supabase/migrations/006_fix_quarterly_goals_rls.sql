-- Fix RLS policies for quarterly_goals to allow authenticated users to manage goals
-- The original policy was too restrictive, requiring admin role which may not be set up

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Admins can manage quarterly_goals" ON quarterly_goals;

-- Add a more permissive policy for authenticated users
-- This allows any authenticated user to insert, update, delete goals
CREATE POLICY "Authenticated users can manage quarterly_goals" ON quarterly_goals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also ensure there's a proper insert policy for user_roles so admins can be created
-- First, allow any authenticated user to insert their own role (if it doesn't exist)
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
CREATE POLICY "Users can insert own role" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert admin role for joel@displaychamp.com if not exists
-- You'll need to run this separately with the actual user ID from auth.users
-- INSERT INTO user_roles (user_id, role, brand_access)
-- SELECT id, 'admin', ARRAY[]::UUID[]
-- FROM auth.users
-- WHERE email = 'joel@displaychamp.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
