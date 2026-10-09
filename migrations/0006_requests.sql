-- 0006_requests.sql
-- 고객 신청(작업 신청 / 구매 요청) 테이블

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,            -- 'job' | 'purchase'
  customer_name TEXT NOT NULL,
  -- 작업 신청용
  string_id INTEGER REFERENCES strings(id) ON DELETE SET NULL,
  string_type TEXT,              -- 변환 시점 스냅샷 (FK 깨져도 표시 유지)
  tension_main REAL,
  tension_cross REAL,
  racket_model TEXT,
  job_date TEXT,                 -- 희망 날짜 (선택)
  -- 구매 요청용
  string_custom TEXT,            -- 목록에 없는 스트링 자유 입력
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'done' | 'dismissed'
  issue_number INTEGER,          -- GitHub 이슈 번호 (실패 시 NULL)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
