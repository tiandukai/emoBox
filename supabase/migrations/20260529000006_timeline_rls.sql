-- 时间轴表 RLS 策略
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on timeline_events' AND tablename = 'timeline_events') THEN
    CREATE POLICY "Allow all on timeline_events"
      ON timeline_events
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 开启 Realtime 推送（幂等）
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_events;
