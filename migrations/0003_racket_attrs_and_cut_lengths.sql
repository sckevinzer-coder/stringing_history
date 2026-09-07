-- 0003_racket_attrs_and_cut_lengths.sql
-- 라켓에 헤드사이즈/스트링패턴 컬럼 추가
-- 작업 이력의 단일 cut_length를 메인/크로스 컷 길이(라켓 길이 배수)로 분리

-- 라켓에 헤드사이즈(sq.in)와 스트링 패턴(예: 16x19) 추가
ALTER TABLE rackets ADD COLUMN head_size REAL;
ALTER TABLE rackets ADD COLUMN string_pattern TEXT;

-- 작업 이력의 cut_length를 제거하고, 메인/크로스 컷 길이(라켓 길이 배수)로 분리
ALTER TABLE string_jobs ADD COLUMN cut_length_main REAL;
ALTER TABLE string_jobs ADD COLUMN cut_length_cross REAL;

-- 기존 cut_length 데이터가 있으면 메인 컷 길이로 이전 (필드 의미는 다름을 명시)
UPDATE string_jobs SET cut_length_main = cut_length WHERE cut_length IS NOT NULL;

-- 기존 cut_length 컬럼 제거
ALTER TABLE string_jobs DROP COLUMN cut_length;