-- 双向互动升级：moods 加图片，quotes 加作者
ALTER TABLE moods ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'xiaopang';

-- 更新种子话语的 author（默认小胖写的，肥纯抽）
UPDATE quotes SET author = 'xiaopang' WHERE author IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(author);
