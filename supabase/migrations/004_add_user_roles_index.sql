-- Migration: Add index on user_roles for faster RLS policy checks
-- This fixes the 504 timeout issue when querying daily_pnl

-- Add missing index for faster RLS checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
