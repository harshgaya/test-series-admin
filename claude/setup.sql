-- Run this ONCE in Supabase SQL editor before running the script.
-- Adds the columns the validator writes to. Safe to re-run (IF NOT EXISTS).

ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_validated_at   timestamptz;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_validation_status text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_validation_notes  text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_answer_flag      boolean DEFAULT false;

-- Index so the resumable "WHERE ai_validated_at IS NULL" fetch stays fast.
CREATE INDEX IF NOT EXISTS idx_questions_unvalidated
  ON questions (id) WHERE ai_validated_at IS NULL;

-- ----- AFTER the run, useful queries -----

-- Questions where the AI thinks the marked answer is wrong (review these by hand):
-- select id, ai_validation_notes from questions where ai_answer_flag = true order by id;

-- Questions that had something fixed:
-- select id, ai_validation_status, ai_validation_notes from questions
--   where ai_validation_status = 'fixed' order by id;

-- Reset everything to re-validate from scratch (careful):
-- update questions set ai_validated_at = null, ai_validation_status = null,
--   ai_validation_notes = null, ai_answer_flag = false;

-- Reset only a range (e.g. the old seed questions) to re-run just those:
-- update questions set ai_validated_at = null where id between 2156 and 2185;