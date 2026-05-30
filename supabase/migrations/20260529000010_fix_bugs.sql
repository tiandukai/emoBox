-- 修复两个关键 bug：
-- 1. couple_spaces.invite_code 改为可空（新流程中邀请码在 profiles 表）
-- 2. whispers.sender CHECK 约束放宽，支持任意昵称
ALTER TABLE couple_spaces ALTER COLUMN invite_code DROP NOT NULL;

DO $$
BEGIN
  ALTER TABLE whispers DROP CONSTRAINT IF EXISTS whispers_sender_check;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE whispers ADD CONSTRAINT whispers_sender_check CHECK (char_length(sender) > 0);
