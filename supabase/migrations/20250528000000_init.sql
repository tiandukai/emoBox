-- 肥纯专属情绪盒子 - Supabase 建表 SQL
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

-- 开启 Realtime（moods + whispers 需要实时推送）
ALTER PUBLICATION supabase_realtime ADD TABLE moods;
ALTER PUBLICATION supabase_realtime ADD TABLE whispers;

-- RLS: 允许所有操作（私密应用，anon key 足够）
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whispers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on moods" ON moods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on whispers" ON whispers FOR ALL USING (true) WITH CHECK (true);
