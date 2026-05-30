-- 给 profiles 表添加头像字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
