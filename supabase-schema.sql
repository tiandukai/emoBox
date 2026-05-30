-- 给对方的情绪盒子 - Supabase 建表 SQL
-- 在 Supabase SQL Editor 中执行此文件

-- moods 表：心情、日记、备忘录
CREATE TABLE IF NOT EXISTS moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL,
  mood TEXT,
  note TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('mood', 'diary', 'memo')),
  author TEXT DEFAULT 'feichun',
  done BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_moods_date ON moods(date DESC);
CREATE INDEX IF NOT EXISTS idx_moods_type ON moods(type);
CREATE INDEX IF NOT EXISTS idx_moods_author ON moods(author);
-- 保证同一天同一类型只有一条记录（心情和日记每天一条）
CREATE UNIQUE INDEX IF NOT EXISTS idx_moods_date_type ON moods(date, type) WHERE type IN ('mood', 'diary');

-- quotes 表：纸团话语
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL,
  content TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_mood ON quotes(mood);
CREATE INDEX IF NOT EXISTS idx_quotes_used ON quotes(used);

-- whispers 表：悄悄话
CREATE TABLE IF NOT EXISTS whispers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  sender TEXT NOT NULL CHECK (sender IN ('feichun', 'xiaopang')),
  emotion TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_whispers_created ON whispers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whispers_sender ON whispers(sender);

-- ====== 情侣空间 & 用户体系 ======
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  space_id UUID,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS couple_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code TEXT,
  anniversary_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 恋爱请求表
CREATE TABLE IF NOT EXISTS relationship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rr_to_user ON relationship_requests(to_user);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rr_pending_pair ON relationship_requests(from_user, to_user) WHERE status = 'pending';

-- 给现有表追加 user_id
ALTER TABLE moods ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE whispers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moods_user_id ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id);

-- 开启 Realtime（moods + whispers + 空间需要实时推送）
ALTER PUBLICATION supabase_realtime ADD TABLE moods;
ALTER PUBLICATION supabase_realtime ADD TABLE whispers;
ALTER PUBLICATION supabase_realtime ADD TABLE couple_spaces;

-- RLS: 允许所有操作（私密应用，anon key 足够）
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whispers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on moods" ON moods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on whispers" ON whispers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on couple_spaces" ON couple_spaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on relationship_requests" ON relationship_requests FOR ALL USING (true) WITH CHECK (true);
