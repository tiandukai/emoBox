-- 时间轴事件：支持多图片
-- 新增 images JSONB 数组字段，迁移现有单图数据
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- 将现有 image 数据迁移到 images 数组（仅迁移有值的记录）
UPDATE timeline_events
SET images = jsonb_build_array(image)
WHERE image IS NOT NULL AND image != '' AND (images IS NULL OR images = '[]'::jsonb);
