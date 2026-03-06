-- Analytics RPC functions for server-side aggregation

-- Reads per day (last 30 days)
CREATE OR REPLACE FUNCTION analytics_reads_per_day(p_user_id UUID)
RETURNS TABLE(day DATE, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DATE(read_at) AS day, COUNT(*) AS count
  FROM user_articles
  WHERE user_id = p_user_id AND is_read = true AND read_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(read_at)
  ORDER BY day;
$$;

-- Aggregate totals
CREATE OR REPLACE FUNCTION analytics_totals(p_user_id UUID)
RETURNS TABLE(
  total_read BIGINT,
  total_saved BIGINT,
  read_today BIGINT,
  read_this_week BIGINT,
  read_this_month BIGINT,
  streak_days INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_day DATE;
  v_prev DATE;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE is_read = true),
    COUNT(*) FILTER (WHERE is_saved = true),
    COUNT(*) FILTER (WHERE is_read = true AND read_at::date = CURRENT_DATE),
    COUNT(*) FILTER (WHERE is_read = true AND read_at >= DATE_TRUNC('week', CURRENT_DATE)),
    COUNT(*) FILTER (WHERE is_read = true AND read_at >= DATE_TRUNC('month', CURRENT_DATE))
  INTO total_read, total_saved, read_today, read_this_week, read_this_month
  FROM user_articles WHERE user_id = p_user_id;

  -- Calculate consecutive day streak ending today/yesterday
  v_prev := CURRENT_DATE + 1;
  FOR v_day IN
    SELECT DISTINCT DATE(read_at) d
    FROM user_articles
    WHERE user_id = p_user_id AND is_read = true AND read_at >= NOW() - INTERVAL '365 days'
    ORDER BY d DESC
  LOOP
    IF v_prev - v_day <= 1 THEN
      v_streak := v_streak + 1;
      v_prev := v_day;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  streak_days := v_streak;

  RETURN NEXT;
END;
$$;

-- Top feeds by read count
CREATE OR REPLACE FUNCTION analytics_top_feeds(p_user_id UUID)
RETURNS TABLE(feed_id UUID, feed_title TEXT, read_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id AS feed_id, f.title AS feed_title, COUNT(*) AS read_count
  FROM user_articles ua
  JOIN articles a ON a.id = ua.article_id
  JOIN feeds f ON f.id = a.feed_id
  WHERE ua.user_id = p_user_id AND ua.is_read = true
  GROUP BY f.id, f.title
  ORDER BY read_count DESC
  LIMIT 10;
$$;

-- Feed health overview
CREATE OR REPLACE FUNCTION analytics_feed_health(p_user_id UUID)
RETURNS TABLE(
  feed_id UUID,
  feed_title TEXT,
  feed_url TEXT,
  status TEXT,
  error_message TEXT,
  last_fetched TIMESTAMPTZ,
  article_count BIGINT,
  latest_article TIMESTAMPTZ,
  articles_per_week NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    f.id AS feed_id,
    f.title AS feed_title,
    f.url AS feed_url,
    f.status,
    f.error_message,
    f.last_fetched::timestamptz,
    COUNT(a.id) AS article_count,
    MAX(a.published_at) AS latest_article,
    ROUND(COUNT(a.id) FILTER (WHERE a.published_at >= NOW() - INTERVAL '28 days') / 4.0, 1) AS articles_per_week
  FROM feeds f
  LEFT JOIN articles a ON a.feed_id = f.id
  WHERE f.user_id = p_user_id
  GROUP BY f.id, f.title, f.url, f.status, f.error_message, f.last_fetched
  ORDER BY f.title;
$$;
