-- string_id_link.sql
-- 작업 이력의 string_type을 마스터 스트링과 매칭하여 string_id 연결 (대소문자 무시)
UPDATE string_jobs SET string_id=1 WHERE TRIM(lower(string_type))='focus hex';
UPDATE string_jobs SET string_id=2 WHERE TRIM(lower(string_type))='tour bite';
UPDATE string_jobs SET string_id=3 WHERE TRIM(lower(string_type))='g-tour3';
UPDATE string_jobs SET string_id=4 WHERE TRIM(lower(string_type))='black pearl';
UPDATE string_jobs SET string_id=5 WHERE TRIM(lower(string_type))='rpm rough';
UPDATE string_jobs SET string_id=6 WHERE TRIM(lower(string_type))='hepta twist';
UPDATE string_jobs SET string_id=9 WHERE TRIM(lower(string_type))='hyper-g soft';
UPDATE string_jobs SET string_id=10 WHERE TRIM(lower(string_type))='enso pro';
UPDATE string_jobs SET string_id=11 WHERE TRIM(lower(string_type))='snapper';
UPDATE string_jobs SET string_id=12 WHERE TRIM(lower(string_type))='super toro';
UPDATE string_jobs SET string_id=13 WHERE TRIM(lower(string_type))='cavior' OR TRIM(lower(string_type))='caviar';
UPDATE string_jobs SET string_id=14 WHERE TRIM(lower(string_type))='egg power';
UPDATE string_jobs SET string_id=15 WHERE TRIM(lower(string_type))='알루파워 러프' OR TRIM(lower(string_type))='alu power rough';
UPDATE string_jobs SET string_id=16 WHERE TRIM(lower(string_type))='multi-feel';
UPDATE string_jobs SET string_id=17 WHERE TRIM(lower(string_type))='polytour pro';
UPDATE string_jobs SET string_id=18 WHERE TRIM(lower(string_type))='polytour drive';
UPDATE string_jobs SET string_id=19 WHERE TRIM(lower(string_type))='m-6 pro';
UPDATE string_jobs SET string_id=20 WHERE TRIM(lower(string_type))='poly hightec';
UPDATE string_jobs SET string_id=21 WHERE TRIM(lower(string_type))='toro toro';
UPDATE string_jobs SET string_id=22 WHERE TRIM(lower(string_type))='big hitter';
UPDATE string_jobs SET string_id=23 WHERE TRIM(lower(string_type))='multifibre';