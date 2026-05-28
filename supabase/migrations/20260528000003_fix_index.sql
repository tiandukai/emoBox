-- 删除旧索引，创建包含 author 的新唯一索引
DROP INDEX IF EXISTS idx_moods_date_type;
CREATE UNIQUE INDEX IF NOT EXISTS idx_moods_date_type_author
ON moods(date, type, author) WHERE type IN ('mood', 'diary');
