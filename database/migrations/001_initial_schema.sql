-- TECH AUCTION Database Schema
-- Complete PostgreSQL migration

-- =============================================
-- ENUMS
-- =============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'PARTICIPANT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE round_status AS ENUM ('NOT_STARTED', 'ACTIVE', 'PAUSED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('NOT_STARTED', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'DISQUALIFIED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM ('CLEAR', 'UNDER_REVIEW', 'DISQUALIFIED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_type AS ENUM (
    'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'RIGHT_CLICK',
    'TAB_SWITCH', 'WINDOW_BLUR', 'VISIBILITY_CHANGE', 'FULLSCREEN_EXIT'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE test_case_type AS ENUM ('PUBLIC', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE execution_status AS ENUM ('PENDING', 'COMPILING', 'RUNNING', 'PASSED', 'FAILED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_validation AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'PARTICIPANT',
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_id VARCHAR(50) UNIQUE NOT NULL, -- display ID like P001
  college VARCHAR(255),
  department VARCHAR(255),
  year INTEGER,
  phone VARCHAR(20),
  status participant_status DEFAULT 'CLEAR',
  current_round INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status round_status DEFAULT 'NOT_STARTED',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  run_limit INTEGER NOT NULL DEFAULT 5,
  allowed_language VARCHAR(10) DEFAULT 'c',
  time_limit_seconds INTEGER DEFAULT 5,
  memory_limit_mb INTEGER DEFAULT 128,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  pause_time TIMESTAMPTZ,
  paused_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Problems table
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  statement TEXT NOT NULL,
  input_format TEXT NOT NULL,
  output_format TEXT NOT NULL,
  constraints TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  allowed_language VARCHAR(10) DEFAULT 'c',
  time_limit_seconds INTEGER DEFAULT 5,
  memory_limit_mb INTEGER DEFAULT 128,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id)
);

-- 5. Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  case_type test_case_type NOT NULL DEFAULT 'PUBLIC',
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, test_number)
);

-- 6. Coding sessions table
CREATE TABLE IF NOT EXISTS coding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  status session_status DEFAULT 'NOT_STARTED',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  pause_time TIMESTAMPTZ,
  paused_duration_seconds INTEGER DEFAULT 0,
  run_count INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, round_id)
);

-- 7. Code drafts table (autosave)
CREATE TABLE IF NOT EXISTS code_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL DEFAULT '',
  language VARCHAR(10) DEFAULT 'c',
  save_trigger VARCHAR(50) DEFAULT 'autosave', -- autosave, run, submit, security, blur, focus_loss
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Submissions table (immutable snapshots)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
  submission_number INTEGER NOT NULL,
  source_code TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'c',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  run_count_at_submission INTEGER DEFAULT 0,
  test_cases_passed INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,
  execution_status execution_status DEFAULT 'PENDING',
  score INTEGER DEFAULT 0,
  validation_status submission_validation DEFAULT 'PENDING',
  admin_remarks TEXT,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, round_id, submission_number)
);

-- 9. Submission test results table
CREATE TABLE IF NOT EXISTS submission_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  passed BOOLEAN DEFAULT false,
  actual_output TEXT,
  execution_time_ms INTEGER,
  memory_used_kb INTEGER,
  status execution_status DEFAULT 'PENDING',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Security incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
  incident_type incident_type NOT NULL,
  description TEXT,
  code_snapshot TEXT,
  status incident_status DEFAULT 'PENDING',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Admin reviews table
CREATE TABLE IF NOT EXISTS admin_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id),
  decision incident_status NOT NULL,
  reason TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  round_score INTEGER DEFAULT 0,
  test_cases_passed INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,
  best_submission_id UUID REFERENCES submissions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, round_id)
);

-- 13. Leaderboard (materialized)
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rank INTEGER,
  round1_score INTEGER DEFAULT 0,
  round2_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  status participant_status DEFAULT 'CLEAR',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id)
);

-- 14. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  actor_role user_role,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_coding_sessions_participant ON coding_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_coding_sessions_round ON coding_sessions(round_id);
CREATE INDEX IF NOT EXISTS idx_coding_sessions_status ON coding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_code_drafts_session ON code_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_code_drafts_participant_round ON code_drafts(participant_id, round_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submission_test_results_submission ON submission_test_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_participant ON security_incidents(participant_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_round ON security_incidents(round_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_incident ON admin_reviews(incident_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant ON scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);

-- =============================================
-- UPDATE TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY['users', 'participants', 'rounds', 'problems', 'coding_sessions', 'scores'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;
