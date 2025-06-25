-- Migration: Add resume_url and cover_letter_url to job_applications table
-- Run this in your Supabase SQL Editor

-- Add resume_url column (ignore error if it already exists)
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Add cover_letter_url column (ignore error if it already exists)
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter_url TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_applications'
AND table_schema = 'public'
AND column_name IN ('resume_url', 'cover_letter_url');
