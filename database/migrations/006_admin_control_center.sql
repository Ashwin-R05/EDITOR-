-- Migration 006: Admin Control Center & Real-Time Monitoring

-- 1. Activity Feed table (using audit_logs as primary, this extends with typed activity)
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR(20),
  actor_name VARCHAR(255),
  participant_id UUID REFERENCES participants(id),
  round_id UUID REFERENCES rounds(id),
  session_id UUID REFERENCES coding_sessions(id),
  target_type VARCHAR(50),
  target_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_participant ON activity_feed(participant_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_round ON activity_feed(round_id);

-- 2. Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  severity VARCHAR(20) DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT false,
  participant_id UUID REFERENCES participants(id),
  round_id UUID REFERENCES rounds(id),
  reference_type VARCHAR(50),
  reference_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(notification_type);

-- 3. Add last_heartbeat column to participants if not exists
ALTER TABLE participants ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;

-- 4. Add pause_time tracking to coding_sessions for per-session pause
ALTER TABLE coding_sessions ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
