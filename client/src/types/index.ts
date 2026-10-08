export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'PARTICIPANT';
  displayName: string;
}

export interface Participant {
  id: string;
  user_id: string;
  participant_id: string;
  college: string;
  department: string;
  year: number;
  phone: string;
  status: ParticipantStatus;
  current_round: number;
  is_online: boolean;
  last_seen: string;
  display_name?: string;
  email?: string;
}

export type ParticipantStatus = 'CLEAR' | 'UNDER_REVIEW' | 'DISQUALIFIED' | 'COMPLETED';

export type RoundStatus = 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export type SessionStatus = 'NOT_STARTED' | 'ACTIVE' | 'UNDER_REVIEW' | 'COMPLETED' | 'DISQUALIFIED';

export type IncidentType = 'COPY_ATTEMPT' | 'PASTE_ATTEMPT' | 'CUT_ATTEMPT' | 'RIGHT_CLICK' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'VISIBILITY_CHANGE' | 'FULLSCREEN_EXIT';

export type IncidentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type ExecutionStatus = 'PENDING' | 'COMPILING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'WRONG_ANSWER' | 'PARTIALLY_PASSED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'OUTPUT_LIMIT_EXCEEDED' | 'SYSTEM_ERROR';

export interface Round {
  id: string;
  round_number: number;
  name: string;
  description: string;
  status: RoundStatus;
  duration_minutes: number;
  run_limit: number;
  allowed_language: string;
  time_limit_seconds: number;
  memory_limit_mb: number;
  start_time: string | null;
  end_time: string | null;
}

export interface Problem {
  id: string;
  round_id: string;
  title: string;
  statement: string;
  input_format: string;
  output_format: string;
  constraints: string;
  examples: Example[];
  starter_code?: string;
}

export interface TestCaseResult {
  testCaseId: string;
  testNumber: number;
  caseType: 'PUBLIC' | 'HIDDEN';
  passed: boolean;
  actualOutput?: string;
  expectedOutput?: string;
  input?: string;
  status: 'PASSED' | 'FAILED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'OUTPUT_LIMIT_EXCEEDED';
  executionTimeMs: number;
  errorMessage?: string;
}

export interface RunExecutionResponse {
  status: ExecutionStatus;
  compilationError?: string;
  totalTests?: number;
  passedTests?: number;
  executionTime?: number;     // seconds
  executionTimeMs?: number;   // milliseconds
  results?: TestCaseResult[];
  runNumber?: number;
  runsRemaining?: number;
  maxRuns?: number;
  runLimitReached?: boolean;
  phase?: string;
  // Legacy compat aliases
  totalTestCases?: number;
  passedTestCases?: number;
  runCount?: number;
  remainingRuns?: number;
}

export interface Example {
  input: string;
  output: string;
  explanation: string;
}

export interface TestCase {
  id: string;
  test_number: number;
  input: string;
  expected_output: string;
  case_type: 'PUBLIC' | 'HIDDEN';
  points: number;
}

export interface CodingSession {
  id: string;
  participant_id: string;
  round_id: string;
  status: SessionStatus;
  run_count: number;
  submission_count: number;
  start_time: string | null;
  end_time: string | null;
}

export type SubmissionValidationStatus = 'PENDING' | 'PENDING_REVIEW' | 'VALIDATED' | 'REJECTED';

export interface SubmissionReview {
  id: string;
  submission_id: string;
  admin_id: string;
  admin_name?: string;
  action: 'VALIDATE' | 'REJECT' | 'REMARK';
  previous_status?: string | null;
  new_status?: string | null;
  remark?: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  participant_id: string;
  round_id: string;
  session_id?: string;
  submission_number: number;
  source_code: string;
  language: string;
  submitted_at: string;
  run_count_at_submission: number;
  test_cases_passed: number;
  total_test_cases: number;
  execution_status: ExecutionStatus;
  execution_time_ms?: number;
  score: number;
  validation_status: SubmissionValidationStatus;
  admin_remarks?: string | null;
  rejection_reason?: string | null;
  validated_at?: string | null;
  round_name?: string;
  round_number?: number;
  // Admin view extended fields
  participant_name?: string;
  participant_email?: string;
  participant_code?: string;
  participant_status?: ParticipantStatus;
  college?: string;
  department?: string;
  year?: number;
  validator_name?: string;
}

export interface SecurityIncident {
  id: string;
  participant_id: string;
  round_id: string;
  session_id: string;
  incident_type: IncidentType;
  description: string;
  code_snapshot: string;
  status: IncidentStatus;
  detected_at: string;
  round_name?: string;
}

export interface Score {
  id: string;
  participant_id: string;
  round_id: string;
  round_score: number;
  test_cases_passed: number;
  total_test_cases: number;
  round_name?: string;
  round_number?: number;
}

export interface LeaderboardEntry {
  id: string;
  participant_id: string;
  display_name: string;
  rank: number;
  round1_score: number;
  round2_score: number;
  total_score: number;
  status: ParticipantStatus;
}

export interface AdminDashboardStats {
  totalParticipants: number;
  activeParticipants: number;
  round1Participants: number;
  round2Participants: number;
  underReview: number;
  disqualified: number;
  completed: number;
  totalSubmissions: number;
  securityIncidents: number;
  pendingIncidents: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  participant: Participant | null;
}

export interface ActivityFeedItem {
  id: string;
  activity_type: string;
  actor_id?: string;
  actor_role?: string;
  actor_name?: string;
  participant_id?: string;
  round_id?: string;
  session_id?: string;
  target_type?: string;
  target_id?: string;
  summary: string;
  metadata?: any;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  notification_type: string;
  title: string;
  message?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  participant_id?: string;
  participant_code?: string;
  participant_name?: string;
  round_id?: string;
  reference_type?: string;
  reference_id?: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

export interface ParticipantListItem {
  id: string;
  participant_id: string;
  college?: string;
  department?: string;
  year?: number;
  phone?: string;
  status: ParticipantStatus;
  is_online: boolean;
  last_seen?: string;
  last_heartbeat?: string;
  registered_at?: string;
  display_name: string;
  email: string;
  active_session_status?: SessionStatus;
  active_run_count?: number;
  active_submission_count?: number;
  active_round_number?: number;
  round_name?: string;
  total_submissions: number;
  pending_incidents: number;
  total_score: number;
}
