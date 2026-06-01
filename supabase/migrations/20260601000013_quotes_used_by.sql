-- 纸团独立拆开：新增 used_by 数组，记录每个用户拆过哪些纸团
-- 旧的 used 布尔列保留不动，历史数据不受影响

-- 1. 新增 used_by 列
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS used_by UUID[] DEFAULT '{}';

-- 2. GIN 索引加速数组包含查询
CREATE INDEX IF NOT EXISTS idx_quotes_used_by ON quotes USING GIN (used_by);
