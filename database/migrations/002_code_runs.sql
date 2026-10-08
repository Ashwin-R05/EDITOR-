-- Migration 002: Add code_runs table for granular execution tracking
CREATE TABLE IF NOT EXISTS code_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES coding_sessions(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  source_code TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  passed_tests INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  compilation_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_runs_participant ON code_runs(participant_id);
CREATE INDEX IF NOT EXISTS idx_code_runs_round ON code_runs(round_id);
CREATE INDEX IF NOT EXISTS idx_code_runs_session ON code_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_code_runs_created ON code_runs(created_at);
