-- 恋爱请求配对系统

-- 1. profiles 添加邀请码
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_code TEXT;
-- 给已有记录生成唯一邀请码
UPDATE profiles SET invite_code = upper(substring(md5(random()::text || id::text) from 1 for 8)) WHERE invite_code IS NULL;

DO $$
BEGIN
  ALTER TABLE profiles ALTER COLUMN invite_code SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_invite_code_unique UNIQUE (invite_code);
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. 恋爱请求表
CREATE TABLE IF NOT EXISTS relationship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rr_to_user ON relationship_requests(to_user);
CREATE INDEX IF NOT EXISTS idx_rr_from_user ON relationship_requests(from_user);
CREATE INDEX IF NOT EXISTS idx_rr_status ON relationship_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rr_pending_pair ON relationship_requests(from_user, to_user) WHERE status = 'pending';

ALTER TABLE relationship_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on relationship_requests') THEN
    CREATE POLICY "Allow all on relationship_requests" ON relationship_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE relationship_requests;
