-- 0005_remaining_uses.sql
-- 스트링 마스터에 남은 사용 횟수 컬럼 추가 (NULL = 미관리/미표시)

ALTER TABLE strings ADD COLUMN remaining_uses INTEGER;
