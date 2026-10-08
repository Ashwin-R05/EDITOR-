-- Migration 004: Submission Management, Review History, and Snapshot Integrity

-- 1. Add PENDING_REVIEW to submission_validation enum
ALTER TYPE submission_validation ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';

-- 2. Enhance submissions table with execution time and rejection reason
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Update any default 'PENDING' validation status to 'PENDING_REVIEW'
UPDATE submissions SET validation_status = 'PENDING_REVIEW' WHERE validation_status = 'PENDING';

-- 4. Create submission_reviews table for full immutable review history
CREATE TABLE IF NOT EXISTS submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'VALIDATE', 'REJECT', 'REMARK'
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_id ON submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_created_at ON submission_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_participant_round ON submissions(participant_id, round_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_validation_status ON submissions(validation_status);
