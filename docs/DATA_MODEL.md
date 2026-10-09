# 데이터 모델

## 테이블

### `customers` (고객)
| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | |
| name | TEXT | NOT NULL | 고객명 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | |

### `rackets` (라켓)
| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | |
| customer_id | INTEGER | NOT NULL, FK → customers(id) ON DELETE CASCADE | |
| racket_model | TEXT | NOT NULL | 라켓 모델명 |
| nickname | TEXT | NULL | 별칭 (예: "1번 라켓") |
| head_size | REAL | NULL | 헤드사이즈 (sq.in) |
| string_pattern | TEXT | NULL | 스트링 패턴 (예: 16x19) |
| created_at | TEXT | NOT NULL | |

### `string_jobs` (스트링 작업 이력)
| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | |
| racket_id | INTEGER | NOT NULL, FK → rackets(id) ON DELETE CASCADE | |
| string_type | TEXT | NOT NULL | 스트링 종류 (자유 텍스트, 마스터와 연결 안 해도 OK) |
| string_id | INTEGER | NULL, FK → strings(id) ON DELETE SET NULL | **Phase 2에서 추가** — 마스터 스트링 선택 시 자동 세팅 |
| tension_main | REAL | NULL | 메인 텐션 (lbs) |
| tension_cross | REAL | NULL | 크로스 텐션 (lbs) |
| cut_length_main | REAL | NULL | 컷 길이 — 메인 (라켓 길이 배수) |
| cut_length_cross | REAL | NULL | 컷 길이 — 크로스 (라켓 길이 배수) |
| job_date | TEXT | NOT NULL | 작업일 (YYYY-MM-DD) |
| price | REAL | NULL | 작업 비용 (원) |
| memo | TEXT | NULL | 비고 |
| created_at | TEXT | NOT NULL | |
| updated_at | TEXT | NOT NULL | |

### `strings` (스트링 마스터) — **Phase 2 신규**
| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | |
| brand | TEXT | NOT NULL | 브랜드 (Wilson, Luxilon, Yonex, Babolat, ...) |
| name | TEXT | NOT NULL | 이름/모델 (Natural Gut, Alu Power, ...) |
| category | TEXT | NOT NULL | 카테고리: `natural_gut` / `polyester` / `multifilament` / `synthetic_gut` / `hybrid` |
| shape | TEXT | NULL | 형태: `round` / `hexagonal` / `heptagonal` / `square` / `textured` / `rough` |
| gauge | TEXT | NULL | 게이지: "16" / "16L" / "17" / "15L" 등 (문자열) |
| color | TEXT | NULL | 색상: `natural` / `black` / `gold` / `blue` / `white` / `red` 등 |
| stiffness_ra | REAL | NULL | 강성 (RA 단위) |
| tension_loss_pct | REAL | NULL | 텐션 로스 (%) |
| spin_potential | INTEGER | NULL | 스핀 잠재력 (1~10) |
| cost | REAL | NULL | 스트링 자체 비용 (원) |
| labor_cost | REAL | NOT NULL, DEFAULT 10000 | 공임비 (원, 기본 1만원) |
| memo | TEXT | NULL | 관리자 메모 (공개 페이지에 절대 노출 안 함) |
| created_at | TEXT | NOT NULL | |

### `sessions` (관리자 세션)
| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | TEXT | PK | 랜덤 토큰 (base64url) |
| created_at | TEXT | NOT NULL | |
| expires_at | TEXT | NOT NULL | |

## 인덱스

- `customers.name` — `idx_customers_name`
- `rackets.customer_id` — `idx_rackets_customer_id`
- `rackets.racket_model` — `idx_rackets_model`
- `string_jobs.racket_id` — `idx_string_jobs_racket_id`
- `string_jobs.string_type` — `idx_string_jobs_string_type`
- `string_jobs.job_date` — `idx_string_jobs_job_date`
- `string_jobs.string_id` — `idx_string_jobs_string_id` (Phase 2)
- `sessions.expires_at` — `idx_sessions_expires_at`
- `strings.brand`, `strings.name` — `idx_strings_brand_model` (Phase 2)

## 마이그레이션 히스토리

| 파일 | 내용 | 비고 |
|---|---|---|
| `0001_init.sql` | customers / rackets / string_jobs / sessions + 인덱스 | |
| `0002_seed.sql` | 로컬 개발용 시드 데이터 | `seed.local.sql`로 이동 (운영 마이그레이션 목록에서 제외) |
| `0003_racket_attrs_and_cut_lengths.sql` | rackets에 head_size, string_pattern / string_jobs에 cut_length_main, cut_length_cross / cut_length 제거 | |
| `0004_strings.sql` (예정) | strings 테이블 + string_jobs.string_id 컬럼 + 인덱스 | Phase 2 |
| `0005_remaining_uses.sql` | strings에 remaining_uses 컬럼 | Phase 5-17 |
| `0006_requests.sql` | requests 테이블 (고객 신청) + 인덱스 | Phase 5-24 |

## 관계도

```
customers (1) ──< (N) rackets (1) ──< (N) string_jobs
                                            │
                                            └──> strings (1)  [string_id, nullable]
```

- 라켓 삭제 → string_jobs cascade 삭제
- 고객 삭제 → rackets cascade 삭제 → string_jobs cascade 삭제
- 스트링 마스터 삭제 → string_jobs의 string_id는 NULL로 설정 (string_type은 유지되어 작업 이력은 보존)

### `requests` (고객 신청) — **Phase 5-24 신규**

| 필드 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | |
| type | TEXT | `job`(작업 신청) / `purchase`(구매 요청) |
| customer_name | TEXT NOT NULL | 신청자 이름 |
| string_id | INTEGER NULL, FK → strings(id) ON DELETE SET NULL | 선택 스트링 (품절은 작업 신청 불가) |
| string_type | TEXT NULL | 변환 시점 스냅샷 (`브랜드 이름 게이지`) |
| tension_main / tension_cross | REAL NULL | job 필수(main) |
| racket_model | TEXT NULL | 자유 입력 (job) |
| job_date | TEXT NULL | 희망 날짜 (job, 선택) |
| string_custom | TEXT NULL | 목록 외 스트링 직접 입력 (purchase) |
| memo | TEXT NULL | |
| status | TEXT | `new` / `done`(이력 변환) / `dismissed` |
| issue_number | INTEGER NULL | GitHub 이슈 번호 (발급 실패 시 NULL) |

- 인덱스: `idx_requests_status`, `idx_requests_type`
- 신청 시 `remaining_uses` 차감 없음. `/rhksflwk/new` 변환 등록 시 기존 `consumeStringUse`로 차감