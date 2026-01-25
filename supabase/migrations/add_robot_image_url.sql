-- Migration: Add robot_image_url column to pit_scouting_data table
-- Date: 2026-01-24
-- Description: Adds robot_image_url column to store URLs of robot images uploaded during pit scouting

ALTER TABLE pit_scouting_data ADD COLUMN IF NOT EXISTS robot_image_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN pit_scouting_data.robot_image_url IS 'URL of the robot image uploaded during pit scouting';
