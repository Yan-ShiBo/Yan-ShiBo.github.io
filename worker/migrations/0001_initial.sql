CREATE TABLE counter_totals (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0)
) WITHOUT ROWID;

INSERT INTO counter_totals (key, value) VALUES ('site_views', 0);

CREATE TABLE page_views (
  path TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0)
) WITHOUT ROWID;

CREATE TABLE monthly_devices (
  period TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  PRIMARY KEY (period, device_hash)
) WITHOUT ROWID;
