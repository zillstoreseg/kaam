-- Add plan limit columns to enable resource control per subscription
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_students integer DEFAULT 100;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_branches integer DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_coaches integer DEFAULT 5;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_branch_managers integer DEFAULT 2;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_storage_mb integer DEFAULT 1024;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features_json jsonb DEFAULT '{}'::jsonb;

-- Add helpful comments
COMMENT ON COLUMN plans.max_students IS 'Maximum number of students allowed in this plan';
COMMENT ON COLUMN plans.max_branches IS 'Maximum number of branches allowed in this plan';
COMMENT ON COLUMN plans.max_coaches IS 'Maximum number of coach users allowed in this plan';
COMMENT ON COLUMN plans.max_branch_managers IS 'Maximum number of branch manager users allowed in this plan';
COMMENT ON COLUMN plans.max_storage_mb IS 'Maximum storage space in megabytes';
COMMENT ON COLUMN plans.features_json IS 'Additional feature flags and configuration as JSON';
