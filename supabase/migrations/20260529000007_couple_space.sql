-- 情侣空间 + 用户身份体系
-- 所有操作幂等，可重复执行

-- profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  space_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- couple_spaces 表
CREATE TABLE IF NOT EXISTS couple_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 给现有表追加 user_id
ALTER TABLE moods ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE whispers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 索引（IF NOT EXISTS 保证幂等）
CREATE INDEX IF NOT EXISTS idx_profiles_space ON profiles(space_id);
CREATE INDEX IF NOT EXISTS idx_couple_spaces_owner ON couple_spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_couple_spaces_partner ON couple_spaces(partner_id);
CREATE INDEX IF NOT EXISTS idx_couple_spaces_code ON couple_spaces(invite_code);
CREATE INDEX IF NOT EXISTS idx_moods_user_id ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_spaces ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on profiles') THEN
    CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on couple_spaces') THEN
    CREATE POLICY "Allow all on couple_spaces" ON couple_spaces FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Realtime（幂等：已存在不会报错）
ALTER PUBLICATION supabase_realtime ADD TABLE couple_spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
