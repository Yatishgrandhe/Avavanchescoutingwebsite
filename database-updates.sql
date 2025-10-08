-- Database Updates for Admin Roles and Alliance Positions
-- Run this in your Supabase SQL editor

-- Add admin role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Add alliance position to scouting_data table
ALTER TABLE scouting_data ADD COLUMN IF NOT EXISTS alliance_position INTEGER CHECK (alliance_position >= 1 AND alliance_position <= 3);

-- Create pick_lists table for admin-only access
CREATE TABLE IF NOT EXISTS pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_key TEXT NOT NULL,
  teams JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on pick_lists
ALTER TABLE pick_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for pick_lists (admin only)
CREATE POLICY "Only admins can view pick lists" ON pick_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can create pick lists" ON pick_lists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update pick lists" ON pick_lists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete pick lists" ON pick_lists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pick_lists_user_id ON pick_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_event_key ON pick_lists(event_key);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'user' role (if not already set)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = user_id 
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Sample admin user (replace with your actual user ID)
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
