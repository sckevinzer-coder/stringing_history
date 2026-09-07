-- strings_import.sql
-- 기존 시트의 보유 스트링 목록 이관 (운영/로컬 공통)
-- 비용(공임포함) → cost(스트링) + labor_cost(공임 1만원)로 분리
-- 예: 2만 → cost=10000, labor=10000 / 2.5만 → cost=15000 / 1.5만 → cost=5000 / 3만 → cost=20000

DELETE FROM strings;

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