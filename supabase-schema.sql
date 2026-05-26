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

CREATE INDEX idx_moods_date ON moods(date DESC);
CREATE INDEX idx_moods_type ON moods(type);
CREATE INDEX idx_moods_author ON moods(author);

-- quotes 表：纸团话语
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL,
  content TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quotes_mood ON quotes(mood);
CREATE INDEX idx_quotes_used ON quotes(used);

-- 开启 Realtime（仅 moods 表需要实时推送）
ALTER PUBLICATION supabase_realtime ADD TABLE moods;

-- RLS: 允许所有操作（私密应用，anon key 足够）
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on moods" ON moods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
