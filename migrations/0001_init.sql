-- 0001_init.sql
-- 고객, 라켓, 스트링 작업 이력, 세션 테이블 초기화

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS rackets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  racket_model TEXT NOT NULL,
  nickname TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rackets_customer_id ON rackets(customer_id);
CREATE INDEX IF NOT EXISTS idx_rackets_model ON rackets(racket_model);

CREATE TABLE IF NOT EXISTS string_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  racket_id INTEGER NOT NULL,
  string_type TEXT NOT NULL,
  tension_main REAL,
  tension_cross REAL,
  cut_length REAL,
  job_date TEXT NOT NULL,
  price REAL,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (racket_id) REFERENCES rackets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_string_jobs_racket_id ON string_jobs(racket_id);
CREATE INDEX IF NOT EXISTS idx_string_jobs_string_type ON string_jobs(string_type);
CREATE INDEX IF NOT EXISTS idx_string_jobs_job_date ON string_jobs(job_date);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);