-- 创建照片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- 允许公开上传和读取照片
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public access to photos'
  ) THEN
    CREATE POLICY "Public access to photos"
    ON storage.objects FOR ALL
    USING (bucket_id = 'photos')
    WITH CHECK (bucket_id = 'photos');
  END IF;
END $$;
