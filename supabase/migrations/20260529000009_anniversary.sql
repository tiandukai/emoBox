-- 首页"在一起天数"功能：添加纪念日字段
ALTER TABLE couple_spaces ADD COLUMN IF NOT EXISTS anniversary_date DATE;
