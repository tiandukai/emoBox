-- 时间轴事件表
-- 记录两人的共同回忆，按时间线展示
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  place TEXT NOT NULL DEFAULT '',
  image TEXT,
  author TEXT NOT NULL DEFAULT 'feichun'
);

-- 按日期排序查询索引
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(date DESC);

-- 按作者筛选索引
CREATE INDEX IF NOT EXISTS idx_timeline_events_author ON timeline_events(author);
