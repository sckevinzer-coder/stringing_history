-- 0004_strings.sql
-- 스트링 마스터 테이블 추가 + string_jobs에 string_id 외래키 컬럼 추가

CREATE TABLE IF NOT EXISTS strings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,           -- natural_gut / polyester / multifilament / synthetic_gut / hybrid
  shape TEXT,                      -- round / hexagonal / heptagonal / square / textured / rough
  gauge TEXT,                      -- 16 / 16L / 17 / 15L
  color TEXT,                      -- natural / black / gold / blue / white / red
  stiffness_ra REAL,               -- 강성 (RA)
  tension_loss_pct REAL,           -- 텐션 로스 (%)
  spin_potential INTEGER,          -- 스핀 잠재력 (1~10)
  cost REAL,                       -- 스트링 자체 비용 (원)
  labor_cost REAL NOT NULL DEFAULT 10000,  -- 공임비 (원, 기본 1만원)
  memo TEXT,                       -- 관리자 메모 (공개 페이지 비공개)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_strings_brand_model ON strings(brand, name);
CREATE INDEX IF NOT EXISTS idx_strings_category ON strings(category);

ALTER TABLE string_jobs ADD COLUMN string_id INTEGER REFERENCES strings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_string_jobs_string_id ON string_jobs(string_id);