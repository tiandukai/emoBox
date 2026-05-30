-- 时间轴事件添加事情描述字段
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
