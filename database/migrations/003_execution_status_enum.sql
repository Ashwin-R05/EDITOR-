-- Migration 003: Add missing execution_status enum values for Phase 3
ALTER TYPE execution_status ADD VALUE IF NOT EXISTS 'WRONG_ANSWER';
ALTER TYPE execution_status ADD VALUE IF NOT EXISTS 'PARTIALLY_PASSED';
ALTER TYPE execution_status ADD VALUE IF NOT EXISTS 'OUTPUT_LIMIT_EXCEEDED';
ALTER TYPE execution_status ADD VALUE IF NOT EXISTS 'SYSTEM_ERROR';
