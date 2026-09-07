-- seed.sql: 로컬 개발용 샘플 데이터

INSERT INTO customers (name) VALUES ('홍길동');
INSERT INTO customers (name) VALUES ('김테니스');

INSERT INTO rackets (customer_id, racket_model, nickname, head_size, string_pattern) VALUES
  (1, 'Wilson Pro Staff RF97', '메인 라켓', 97, '16x19'),
  (1, 'Babolat Pure Drive', NULL, 100, '16x19'),
  (2, 'Yonex EZONE 100', '1번 라켓', 100, '16x19');

INSERT INTO strings (brand, name, category, shape, gauge, color, stiffness_ra, tension_loss_pct, spin_potential, cost, labor_cost, memo) VALUES
  ('MSV', 'Focus HEX', 'polyester', '6각', '1.10', '하늘', 185.7, 43.3, 8.6, 10000, 10000, NULL),
  ('솔린코', 'Tour Bite', 'polyester', '5각', '1.10', '회색', NULL, NULL, NULL, 10000, 10000, NULL),
  ('고센', 'G-Tour3', 'polyester', '원형', '1.23', '노랑', 184, 31.1, 5.3, 10000, 10000, NULL),
  ('OEHMS', 'Black Pearl', 'polyester', '5각', '1.25', '검정', NULL, NULL, NULL, 10000, 10000, NULL),
  ('바볼랏', 'RPM Rough', 'polyester', '러프', '1.25', '주황', 196, 35.7, 9.9, 10000, 10000, NULL),
  ('MSV', 'Hepta Twist', 'polyester', '7각꼬임', '1.20', '빨강', 181.2, 50.2, 5.7, 10000, 10000, NULL),
  ('헤드', 'Velocity MLT', 'multifilament', '원형', '1.25', '회색', NULL, NULL, NULL, 15000, 10000, NULL),
  ('프린스', 'Super SYN GUT', 'synthetic_gut', '원형', '1.30', '빨강', NULL, NULL, NULL, 5000, 10000, NULL),
  ('솔린코', 'Hyper-G Soft', 'polyester', '5각', '1.20', '녹색', 172, 28.7, 5.2, 10000, 10000, NULL),
  ('Toroline', 'ENSO PRO', 'polyester', '원형', '1.25', '회색', '부드러움', NULL, NULL, 20000, 10000, NULL),
  ('Toroline', 'SNAPPER', 'polyester', '10각', '1.23', '라벤더', '부드러움', NULL, NULL, 20000, 10000, NULL),
  ('Toroline', 'SUPER TORO', 'polyester', '6각', '1.23', '하늘', NULL, NULL, NULL, 20000, 10000, NULL),
  ('Toroline', 'CAVIOR', 'polyester', '6각', '1.16', '형광', NULL, NULL, NULL, 20000, 10000, NULL),
  ('고센', 'Egg Power', 'polyester', '원형꼬임', '1.22~24', '노랑', NULL, NULL, NULL, 10000, 10000, NULL),
  ('럭실론', 'AluPower Rough', 'polyester', '러프', '1.25', '회색', 209.2, 39.6, 6.5, 20000, 10000, NULL),
  ('Tecnifibre', 'Multi-Feel', 'multifilament', '원형', '1.25', '핑크', NULL, NULL, NULL, 15000, 10000, NULL),
  ('요넥스', 'Polytour Pro', 'polyester', '원형', '1.15', '파랑', 188.6, 33.3, 5.2, 10000, 10000, NULL),
  ('요넥스', 'Polytour Drive', 'polyester', '8각', '1.25', '회색', 195.5, 47.1, 7.6, 10000, 10000, NULL),
  ('K-CEDAR', 'M-6 PRO', 'polyester', '6각', '1.10', '빨강', '딱딱함', NULL, NULL, 10000, 10000, NULL),
  ('polyfibre', 'POLY HIGHTEC', 'polyester', '원형', '1.15', '노랑', 150.3, 61, 3.9, 5000, 10000, NULL),
  ('Toroline', 'Toro Toro', 'polyester', '6각', '1.23', '핑크', '부드러움', NULL, NULL, 20000, 10000, NULL),
  ('Tourna', 'Big Hitter', 'polyester', '7각', '1.20', '검정', 175.5, 43, 6.3, 10000, 10000, NULL),
  ('커시바움', 'MultiFibre', 'multifilament', '원형', '1.30', '노랑', NULL, NULL, NULL, 20000, 10000, NULL);

INSERT INTO string_jobs (racket_id, string_type, tension_main, tension_cross, cut_length_main, cut_length_cross, job_date, price, memo)
VALUES
  (1, 'Wilson Natural Gut 16', 50, 48, 8.25, 7.5, '2026-01-15', 50000, '첫 시공. 손맛 좋음.'),
  (1, 'Luxilon Alu Power Rough 16L', 48, 46, 8.25, 7.5, '2026-02-20', 30000, NULL),
  (2, 'Babolat RPM Blast 16', 52, 50, 8.25, 7.5, '2026-02-25', 25000, '스핀 잘 나옴'),
  (3, 'Yonex Poly Tour Pro 16', 45, 43, 8.25, 7.5, '2026-03-02', 28000, NULL);