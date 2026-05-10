-- Persist detected article language (ISO 639-3, e.g. eng, por, cmn, und) at RSS ingest.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS language TEXT;

COMMENT ON COLUMN articles.language IS 'ISO 639-3 from franc-min on title+description (und = undetermined / too short).';

CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language)
  WHERE language IS NOT NULL;
