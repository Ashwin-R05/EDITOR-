-- Migration 005: Real-Time Security Monitoring & Anti-Cheat System

-- 1. Add columns to security_incidents
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS incident_code VARCHAR(50);
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'HIGH';
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id);
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS admin_decision VARCHAR(50); -- 'ACCEPT', 'DECLINE'
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS admin_reason TEXT;
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ;
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create index on incident_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_incidents_code ON security_incidents(incident_code) WHERE incident_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_incidents_participant_status ON security_incidents(participant_id, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_round_status ON security_incidents(round_id, status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_detected_at ON security_incidents(detected_at DESC);
