# API

Base: Workers URL (예: `https://tennis.stringing.workers.dev`)

`Accept: application/json` 헤더가 있으면 JSON 응답, 없으면 302 리다이렉트(폼 페이지 흐름).

## 인증

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/auth/login` | - | 비밀번호 검증 → 세션 생성 → 쿠키 발급 |
| POST | `/api/auth/logout` | 필요 | 세션 삭제 → 쿠키 제거 |

관리자 보호 라우트는 `requireAdmin` 미들웨어가 동작:
- JSON 요청 (`Accept: application/json`) → 401 + `{"error":"인증이 필요합니다."}`
- 그 외 → 302 → `/admin/login`

## 작업 이력 (`/api/jobs`)

| 메서드 | 경로 | 인증 | 쿼리/본문 | 설명 |
|---|---|---|---|---|
| GET | `/api/jobs` | - | `q, string_type, string_id, date_from, date_to, tension_min, tension_max, limit, offset` | 목록 |
| GET | `/api/jobs/:id` | - | - | 단건 |
| POST | `/api/jobs` | 필요 | JSON: `{racket_id, string_type, string_id?, tension_main, tension_cross, cut_length_main, cut_length_cross, job_date, price, memo}` | 등록 |
| PUT | `/api/jobs/:id` | 필요 | JSON | 수정 |
| DELETE | `/api/jobs/:id` | 필요 | - | 삭제 |

응답 필드 (단건): `id, jobDate, stringType, stringId, stringBrand, stringName, stringCategory, stringGauge, stringColor, stringShape, stringCost, stringLaborCost, tensionMain, tensionCross, cutLengthMain, cutLengthCross, jobDate, price, memo, racketId, racketModel, racketHeadSize, racketStringPattern, customerId, customerName, createdAt, updatedAt`

## 고객 (`/api/customers`)

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/customers` | 필요 | `?q=` 검색 |
| POST | `/api/customers` | 필요 | `{name}` |
| GET | `/api/customers/:id` | 필요 | 단건 |
| GET | `/api/customers/:id/rackets` | 필요 | 라켓 목록 |
| POST | `/api/customers/:id/rackets` | 필요 | `{racket_model, nickname?, head_size?, string_pattern?}` |

## 라켓 (`/api/rackets`)

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/rackets/:id/edit` | 필요 | `{racket_model, nickname?, head_size?, string_pattern?}` 폼 POST |
| POST | `/api/rackets/:id/delete` | 필요 | 삭제 (string_jobs cascade) |

(실제로는 `/admin/rackets/...` 라우트로 폼 처리)

## 스트링 마스터 (`/api/strings`) — Phase 2

| 메서드 | 경로 | 인증 | 쿼리/본문 | 설명 |
|---|---|---|---|---|
| GET | `/api/strings` | - | `?q=브랜드/이름`, `?category=`, `?limit=`, `?offset=` | 공개, 검색/필터 |
| POST | `/api/strings` | 필요 | `{brand, name, category, shape?, gauge?, color?, stiffness_ra?, tension_loss_pct?, spin_potential?, cost?, labor_cost?, memo?}` | 등록 |
| PUT | `/api/strings/:id` | 필요 | JSON 또는 폼 | 수정 |
| DELETE | `/api/strings/:id` | 필요 | - | 삭제 (string_jobs의 string_id는 NULL, string_type은 유지) |

공개 응답 필드 (전체 + 공개 가능):
- `id, brand, name, category, shape, gauge, color, cost, labor_cost, createdAt`

관리자 응답 필드 (전체 + 내부 평가 포함):
- 위 + `stiffnessRa, tensionLossPct, spinPotential, memo`

## 페이지 라우트 (HTML)

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | `/` | - | 공개 작업 이력 목록 (Phase 2에서 보유 스트링 섹션 추가) |
| GET | `/strings` | - | 공개 스트링 마스터 목록 (Phase 2) |
| GET | `/strings/:id` | - | 공개 스트링 단건 상세 (Phase 2, 선택) |
| GET | `/admin/login` | - | 로그인 페이지 |
| GET | `/admin` | 필요 | 대시보드 |
| GET | `/admin/customers` | 필요 | 고객 목록 |
| POST | `/admin/customers` | 필요 | 고객 등록 폼 |
| GET | `/admin/customers/:id` | 필요 | 고객 상세 (라켓 목록) |
| POST | `/admin/customers/:id/rackets` | 필요 | 라켓 등록 폼 |
| GET | `/admin/new` | 필요 | 작업 등록 폼 |
| POST | `/admin/new` | 필요 | 작업 등록 처리 |
| GET | `/admin/edit/:id` | 필요 | 작업 수정 폼 |
| POST | `/admin/edit/:id` | 필요 | 작업 수정 처리 |
| POST | `/admin/jobs/:id/delete` | 필요 | 작업 삭제 |
| GET | `/admin/strings` | 필요 | 스트링 마스터 관리 (Phase 2) |
| GET | `/admin/strings/new` | 필요 | 스트링 등록 폼 (Phase 2) |
| POST | `/admin/strings` | 필요 | 스트링 등록 처리 (Phase 2) |
| GET | `/admin/strings/:id/edit` | 필요 | 스트링 수정 폼 (Phase 2) |
| POST | `/admin/strings/:id/edit` | 필요 | 스트링 수정 처리 (Phase 2) |
| POST | `/admin/strings/:id/delete` | 필요 | 스트링 삭제 (Phase 2) |
| GET | `/admin/rackets/:id/edit` | 필요 | 라켓 수정 폼 |
| POST | `/admin/rackets/:id/edit` | 필요 | 라켓 수정 처리 |
| POST | `/admin/rackets/:id/delete` | 필요 | 라켓 삭제 |
| GET | `/health` | - | 헬스 체크 `{ok:true}` |