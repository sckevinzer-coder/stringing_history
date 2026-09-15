# 보안 점검 현황 (주통 기준)

> 주요정보통신기반시설 취약점 점검 가이드(주통) 응용프로그램 기준 점검
> 점검일: 2026-09-07 / 대상: tennis.stringing.workers.dev (Cloudflare Workers + Hono + D1)

## 사전 조사로 확인된 취약점 후보

| # | 항목 | 주통 분류 | 상태 |
|---|------|-----------|------|
| 1 | 쿠키 Secure 플래그 미설정 | 2.2 세션관리 | 🔍 Phase 1 |
| 2 | CSRF 토큰 미적용 | 2.1 입력값검증 | 🔍 Phase 3 |
| 3 | 보안 헤더 미설정 (CSP, XFO 등) | 2.4 기타 | 🔍 Phase 4 |
| 4 | 로그인 시도 제한 없음 | 2.3 인증/인가 | 🔍 Phase 2 |
| 5 | 에러 메시지 정보 노출 (`500: {err.message}`) | 2.4 기타 | 🔍 Phase 4 |
| 6 | 뷰어 인증 쿠키에 비밀번호 원문 저장 | 2.2 세션관리 | 🔍 Phase 1 |
| 7 | 관리자 ID 소스 하드코딩 (`sckevinzer`) | 2.4 기타 | 🔍 Phase 4 |

## 점검 진행 상황

- [x] Phase 1 — 세션관리 (쿠키 플래그, 세션 타임아웃, 세션 ID 관리)
- [ ] Phase 2 — 인증/인가 (무차별 대입, 인증 우회, 오픈 리다이렉트)
- [ ] Phase 3 — 입력값 검증 (SQLi, XSS, CSRF, 데이터 유효성)
- [ ] Phase 4 — 기타 (에러 노출, 보안 헤더, 민감정보, 의존성)
- [ ] Phase 5 — 배포 환경 실사 종합 + 결과 보고서

## Phase 1 결과 — 세션관리 (2026-09-07)

### 1-1. 쿠키 보안속성 — **취약** → ✅ **조치 완료** (2026-09-07)

| 쿠키 | 발급 위치 | HttpOnly | SameSite | Secure |
|------|-----------|----------|----------|--------|
| `site_auth` (뷰어) | middleware/auth.ts:55 | ✅ | Lax ✅ | ❌ **미설정** |
| `sh_session` (관리자, 페이지 로그인) | routes/admin.tsx:69 | ✅ | Lax ✅ | ❌ **미설정** |
| `sh_session` (API 로그인) | routes/auth.ts:41 | ✅ | Lax ✅ | ✅ (https 조건부) |

- **발견 1**: `Secure` 플래그 미설정 → 중간자 공격 시 쿠키 평문 노출 가능. 참고로 auth.ts(API 경로)는 올바르게 구현되어 있어 **구현 일관성 부족**.
- **발견 2 (실사 확인)**: `site_auth=tlskqmfh` — 뷰어 인증 쿠키에 **비밀번호 원문**이 그대로 저장됨. 쿠키 탈취 시 뷰어 비밀번호 그대로 유출.
- **권고**: buildCookie 호출 시 전체에 `secure: true` 추가 + site_auth는 원문 대신 서명된 랜덤 토큰 저장.
- **조치 내역**:
  - `middleware/auth.ts` — `viewerToken()` 추가: HMAC-SHA256(key=VIEWER_PASSWORD) 파생 토큰을 쿠키에 저장 (원문 노출 제거). 비밀번호 변경 시 토큰 자동 무효화. `secure`/`httpOnly`/`sameSite` 명시 설정.
  - `routes/admin.tsx` — 관리자 세션 쿠키에 `secure` 플래그 추가.
  - 실사 검증: `set-cookie: site_auth=<hmac-token>; HttpOnly; SameSite=Lax; Secure` 확인, 원문 `tlskqmfh` 노출 없음, 토큰 쿠키로 정상 접근(200), 구버전 원문 쿠키는 거부됨(302). ※ 배포 후 기존 브라우저 세션은 재로그인 필요.

### 1-2. 세션 타임아웃 — **양호** (주통 2.2)
- 만료 세션 실사: 10분 전 만료 세션으로 관리자 페이지 접근 → 302 로그인 리다이렉트 ✅
- 관리자 세션 TTL 10분, 뷰어 쿠키 TTL 1일 — 인증 구분 정상 동작.

### 1-3. 세션 ID 관리 — **대체로 양호, 경미한 이슈** → ✅ **조치 완료** (2026-09-07)
- ✅ 세션 ID: UUID v4 (122bit) / randomToken(32) — 충분한 엔트로피, 추측 불가
- ✅ 로그인 시 매번 새 세션 발급 (세션 고정 방지)
- ✅ 로그아웃 시 D1 세션 레코드 삭제 (auth.ts:67, index.ts:64)
- ~~⚠️ `cleanupExpiredSessions()` 정의만 존재하고 호출부 없음~~ → **조치**: 뷰어 로그인 시 `waitUntil`로 만료 세션 정리 실행 (index.ts). 확인: sessions 테이블 잔존 레코드 0건.
- ~~⚠️ 재로그인 시 기존 유효 세션 무효화 안 됨~~ → **조치**: 관리자 로그인 시 기존 세션 전체 삭제 (단일 세션 정책, routes/admin.tsx).

---

# 개발 이력 (기존 문서)


# 진행 상태

최종 업데이트: Phase 2 (스트링 마스터) 완료 후

## 완료 (Phase 1) — 기본 기능

- [x] 프로젝트 초기 세팅 (Hono + Cloudflare Workers + D1 + Drizzle)
- [x] 인증 (단일 관리자 비밀번호, 세션 쿠키 + D1 세션 테이블)
- [x] Drizzle 스키마 (customers / rackets / string_jobs / sessions)
- [x] 마이그레이션 `0001_init.sql`, `0003_racket_attrs_and_cut_lengths.sql` (0002_seed는 별도 `seed.local.sql`로 이동)
- [x] API: `/api/jobs` CRUD (공개 list/get, 관리자 post/put/delete)
- [x] API: `/api/customers` CRUD (관리자)
- [x] API: `/api/customers/:id/rackets` CRUD (관리자)
- [x] API: `/api/auth/login`, `/api/auth/logout`
- [x] 공개 페이지 `/` (작업 이력 목록 + 검색/필터/페이지네이션)
- [x] 관리자 로그인 `/admin/login`
- [x] 관리자 대시보드 `/admin`
- [x] 고객 관리 `/admin/customers`, `/admin/customers/:id`
- [x] 라켓 등록/수정/삭제 (`/admin/customers/:id/rackets`, `/admin/rackets/:id/edit`, `/admin/rackets/:id/delete`)
- [x] 작업 등록/수정/삭제 (`/admin/new`, `/admin/edit/:id`, `/admin/jobs/:id/delete`)
- [x] 라켓 헤드사이즈 / 스트링 패턴 컬럼
- [x] 컷 길이 단위 변경: 단일 → main/cross (라켓 길이 배수)
- [x] 고객 select 변경 시 라켓 select 동적 갱신 (datalist + JSON 임베드)
- [x] `wrangler.toml` `name = "tennis"`로 변경, 배포 완료
- [x] 운영 D1 마이그레이션 (0001 + 0003) 적용 완료

## 진행 중 (Phase 2) — 스트링 마스터 관리

- [x] **DB**: `0004_strings.sql` — `strings` 테이블 + `string_jobs.string_id` 컬럼 (로컬/운영 마이그레이션 적용 완료)
- [x] **Drizzle 스키마**: `src/db/schema.ts`에 `strings` 추가, `string_jobs.stringId` 추가
- [x] **마이그레이션 적용** (로컬 + 운영) ✅
- [x] **API**:
  - `GET /api/strings` 공개 (자동완성 + 카드 표시용, q/category/limit/offset 지원) ✅
  - `GET /api/strings/:id` 공개 ✅
  - `POST /api/strings` 관리자 (JSON) ✅
  - `PUT /api/strings/:id` 관리자 (JSON) ✅
  - `DELETE /api/strings/:id` 관리자 (string_jobs.string_id는 SET NULL) ✅
  - `POST/PUT /api/jobs`에 `string_id` 처리 추가 ✅
  - `GET /api/jobs`, `/api/jobs/:id` 응답에 `stringId`, `masterBrand/Name/Category/Gauge/Color` (LEFT JOIN) 추가 ✅
- [x] **UI (공개)**:
  - `/` 메인: 상단 공임비 안내 배너 + "보유 스트링" 카드 섹션 (상위 6개 + "전체 보기") ✅
  - `/strings` 페이지: 전체 스트링 목록 + 검색 + 카테고리 필터 + 상세 토글 ✅
- [x] **UI (관리자)**:
  - `/admin/strings` 페이지: 테이블 (전체 필드) + 검색 + 카테고리 필터 + 등록/수정/삭제 ✅
  - `/admin/strings/new`, `/admin/strings/:id/edit` 폼 (`StringForm` 컴포넌트) ✅
  - `JobForm`의 string_type input에 datalist 자동완성 + hidden `string_id` 자동 세팅 JS ✅
  - 관리자 대시보드에 "스트링 관리" 메뉴 추가 ✅
- [x] **시드 데이터**: `seed.local.sql`에 스트링 5개 추가 (로컬만) ✅
- [x] **로컬 검증** ✅ (공개 카드/상세 토글, 등록 POST, 작업 등록 시 string_id 저장, API 응답 확인)
- [x] **배포** ✅ (`https://tennis.stringing.workers.dev`, version 6f09598f)

## 완료 (Phase 2 추가) — 시트 데이터 이관

### 스트링 마스터 23종 이관
- 시트의 보유 스트링 목록(23종) 운영/로컬 DB에 이관
- 비용(공임포함) → `cost`(스트링원가) + `labor_cost`(공임 1만)로 분리 저장
  - 2만→1만+1만 / 2.5만→1.5만+1만 / 1.5만→5천+1만 / 3만→2만+1만
- 형태/색상: 한글 그대로 (5각, 6각, 하늘, 라벤더 등) — `stringLabels.ts` 라벨 맵을 시트 기준으로 재정의
- 강성: 숫자는 `stiffness_ra`(REAL), "부드러움/딱딱함"은 TEXT로 저장
- 파일: `scripts/strings_import.sql`

### 작업 이력 이관
- 시트 작업 이력 **173건** 이관 (고객 36명, 라켓 71개 자동 생성)
- `scripts/jobs_data.mjs`(원본데이터 176행) → `scripts/import_jobs.mjs`(SQL 생성) → `scripts/jobs_import.sql`
- 파싱 규칙:
  - 텐션 "48" → main=48 / "42/40" → main=42, cross=40
  - 컷길이 "8.2x 7.5" → main=8.2, cross=7.5
  - 비고(쿠폰/맨줄무게/메모) → `memo` 필드
- **컷길이 단위 주의**: 시트의 값(8.2/7.5 등)은 이미 "라켓 길이 배수"이므로 그대로 저장
- 운영 DB 리셋 후 이관 (기존 테스트 데이터 제거, 이은형은 시트에 포함되어 재이관됨)

### 마스터 string_id 매칭
- `scripts/string_id_link.sql` — string_type이 마스터 이름과 일치하면(대소문자 무시) string_id 연결
- **173건 중 113건 매칭** (나머지는 당시 제공받은 스트링/비매칭 → string_id NULL, 의도된 동작)
- 매핑 예: "Focus HEX"→MSV(1), "Tour Bite"→솔린코(2), "알루파워 러프"→럭실론(15), "Hyper-G soft"→솔린코(9)

### 비용 표시 (표시 시점 계산)
- 작업 이력의 `price` 컬럼은 비워둠 (시트에 단가 없음)
- 공개 페이지 price 셀: `price` 있으면 그 값, 없으면 `마스터 cost + labor_cost` 계산 표시 (`public.tsx`)
- 마스터 비매칭 작업은 "-" 표시

## 진행 중 (Phase 4) — 사용자 피드백 기반 개선

### 이슈 #1: 공개 페이지 스트링 칸이 여전히 넓음
- **증상**: 작업일 칸이 별도로 있어 테이블이 넓게 표시됨
- **원인**: 이전 수정에서 작업일 <th>와 <td>를 제거하지 않고 헤더 텍스트만 변경했었음
- **수정 계획**:
  - 작업일 <th> 완전 제거
  - 스트링 헤더를 w-32로 축소
  - 작업일 <td> 완전 제거
  - 스트링 셀 안에 작업일을 작은 글씨로 함께 표시
- **대상 파일**: src/routes/public.tsx

### 이슈 #2: 작업 등록 폼에서 고객 검색 불가
- **증상**: 고객이 36명 이상인데 select 드롭다운에서 검색 불가
- **수정 계획**: 스트링처럼 input + datalist 자동완성으로 전환
- **대상 파일**: src/views/JobForm.tsx

## 완료 (Phase 3) — UI 개선

### 공개 페이지 작업 이력 테이블 컬럼 최적화
- 작업일 전용 칸을 완전히 제거하고, 스트링 칸 하나에 작업일을 작은 글씨로 함께 표시
- 스트링 헤더를 `w-32`로 축소 + `truncate` 처리
- 변경 파일: `src/routes/public.tsx`

### 신규 고객 인라인 등록
- 작업 등록 폼에서 고객 선택 시 "신규 고객 등록" fieldset 노출
- 고객명 입력 후 "추가" 클릭 → fetch(`/api/customers/inline`) → 즉시 선택됨 + 라켓 로드
- 변경 파일:
  - `src/views/JobForm.tsx` — 신규 고객 fieldset 추가, 인라인 추가 JS 추가
  - `src/routes/api.ts` — `POST /api/customers/inline` 엔드포인트 추가
  - `src/routes/admin.tsx` — `/admin/new` POST 핸들러에서도 인라인 등록 지원

## 완료 (Phase 4) — 사용자 피드백 기반 개선

### 공개 페이지 작업 이력 테이블 최적화 (재수정)
- 작업일 전용 칸을 완전히 제거하고, 스트링 칸에 작업일을 작은 글씨로 함께 표시
- 스트링 헤더를 `w-32`로 축소 + `truncate` 처리
- 변경 파일: `src/routes/public.tsx`

### 작업 등록 폼 고객 검색
- 고객 `<select>` → `<input list="customer-list">` + `<datalist>` 자동완성으로 전환
- 고객 입력 시 hidden `customer_id` 자동 세팅 + 라켓 로드 JS 추가
- 변경 파일: `src/views/JobForm.tsx`

### 공개 페이지 보유 스트링 섹션 제거
- 메인 페이지(작업 이력)에서 보유 스트링 카드 섹션 완전 제거
- 헤더 네비게이션의 "보유 스트링" 링크로 충분
- 변경 파일: `src/routes/public.tsx`

### 검색 필드 텐션 범위 통합
- 텐션 최소/최대 두 칸을 한 칸으로 통합 (`텐션 범위 (lbs): [최소] ~ [최대]`)
- 변경 파일: `src/routes/public.tsx`

### 보유 스트링 카드에 형태 정보 추가
- StringCard 기본 표시에 형태(shape) 정보 추가
- 변경 파일: `src/views/StringCard.tsx`, `src/lib/stringLabels.ts`

### 공개 페이지 컬럼 정리
- 텐션 값에서 `lbs` 제거 (헤더에 있으니 중복)
- 컷 길이 칸 제거 (고객에게는 불필요, 관리자만 참고용)
- 변경 파일: `src/routes/public.tsx`

### 관리자 대시보드 컬럼 정리
- 컷 길이 헤더 간소화 (`컷 길이 (m/c, 라켓 길이)` → `컷 길이`)
- 변경 파일: `src/routes/admin.tsx`

## 완료 (Phase 5-1) — 피드백 & 알림

### Toast 알림 시스템
- 화면 상단에 성공/실패 메시지 표시 (3초 후 자동 사라짐)
- CSS 애니메이션 (toast-in/toast-out)
- URL 파라미터 기반 (`?toast=success&msg=...`)
- 모든 관리자 페이지 리다이렉트에 메시지 추가

### 변경 파일
- `src/views/layout.tsx` — toast 컨테이너, CSS, JS 추가
- `src/routes/admin.tsx` — 모든 리다이렉트에 toast 메시지
- `src/routes/strings.tsx` — 모든 리다이렉트에 toast 메시지

## 완료 (Phase 5-2) — 작업 복사/빠른등록 + 관리자 로그인 UX (2026-09-13)

### 작업 복사 / 빠른등록
- 대시보드 이력 목록 각 행에 `복사` / `빠른등록` 버튼 추가 (기존 `수정` / `삭제` 유지)
- `복사` → `/rhksflwk/new?copy={id}`: 고객/라켓/스트링/텐션/컷길이/가격/메모를 그대로 프리필, 날짜만 오늘로 세팅 + 안내 배너 표시
- `빠른등록` → `POST /rhksflwk/jobs/:id/duplicate`: 클릭 1번으로 즉시 복제 (날짜=오늘), 토스트로 완료 확인
- 정렬(작업일 내림차순 + ID 내림차순) 그대로라 복사본은 목록 최상단에 표시
- 변경 파일: `src/routes/admin.tsx`

### 관리자 로그인 포커스 개선
- `autofocus`가 비밀번호 칸에 있어 아이디 입력이 불편했던 문제 수정
- 아이디 `<input>`으로 `autofocus` 이동 + `autocomplete="username"` / `autocomplete="current-password"` 추가
- 변경 파일: `src/routes/admin.tsx`

## 완료 (Phase 5-3) — 고객 삭제 (2026-09-13)

- 고객 상세 페이지 하단에 "위험 구역" 섹션 추가 (빨간 테두리 박스로 일상 동작과 분리)
- 라켓 수 + 작업 이력 건수를 미리 조회해 화면과 삭제 confirm에 명시
- `POST /rhksflwk/customers/:id/delete`: FK cascade로 라켓 + 작업 이력이 함께 삭제, 완료 후 고객 목록으로 토스트 리다이렉트
- 고객 목록에는 삭제 버튼을 두지 않음 (오클릭 방지)
- 변경 파일: `src/routes/admin.tsx`

## 완료 (Phase 5-4) — 대시보드 페이지네이션 (2026-09-13)

- "최근 등록된 작업 이력 (최대 100건)" → 전체 건수 + 현재 범위 + 페이지 표시 ("전체 N건 중 a–b 표시 (페이지 p/t)")
- 100건/페이지, 이전/다음 네비게이션 (2페이지 이상일 때만 표시)
- 범위 초과 페이지는 마지막 페이지로 보정
- 변경 파일: `src/routes/admin.tsx`

## 완료 (Phase 5-5) — 스트링 목록 ID 컬럼 (2026-09-13)

- 행 데이터(`<td>`)에 ID가 빠져 헤더와 열이 하나씩 밀리던 문제 수정
- ID `<td>`를 맨 앞에 추가해 헤더(ID/브랜드/이름/...)와 정렬 일치
- 변경 파일: `src/routes/strings.tsx`

## 완료 (Phase 5-6) — 스핀 잠재력 표시 단순화 (2026-09-13)

- 목록의 `/10` 접미사 제거 → 값만 표시
- 등록/수정 폼 라벨의 `(1~10)` 제거 + min/max 제한 해제 (10점 만점 아님)
- 변경 파일: `src/routes/strings.tsx`, `src/views/StringForm.tsx`

## 완료 (Phase 5-7) — 고객 상세 라켓 목록 정렬 + 동일추가 (2026-09-13)

- 행 데이터에 ID `<td>`가 빠져 헤더와 열이 하나씩 밀리던 문제 수정 (스트링 목록과 동일한 패턴)
- 각 라켓 행에 `동일추가` 버튼: 클릭 1번으로 같은 고객에게 동일 스펙 라켓 복제 (`POST /rhksflwk/rackets/:id/duplicate`)
- 변경 파일: `src/routes/admin.tsx`

## 완료 (Phase 5-8) — 공개 작업 이력 정렬 헤더 수정 (2026-09-15)

- 증상: 헤더 클릭 시 정렬이 동작하지 않음
- 원인: `<th onClick={...}>` 방식 — Hono JSX SSR에서는 onClick 핸들러가 HTML에 렌더되지 않아 클릭이 무반응
- 수정: `<th>` 안에 실제 `<a href="/?sort=...&order=...">` 링크 배치 (서버 렌더 HTML만으로 동작)
- 2차 수정: 쿼리가 `sort` 파라미터를 무시하고 항상 작업일 내림차순으로 고정되어 있던 문제 수정 — `getSortExpr(activeSort, activeOrder)`로 orderBy 동적 적용
- 3차 수정: 헤더 링크가 `/?` + `?sort=...` 이중 물음표(`/??sort=...`)로 생성되던 문제 수정 — `/${buildQs(...)}`로 변경
- 변경 파일: `src/routes/public.tsx`

## 완료 (Phase 5-9) — 보유 스트링 정렬 (2026-09-15)

- 관리자 스트링 관리: 10개 컬럼 헤더 클릭 정렬 (브랜드/이름/카테고리/게이지/색상/형태/강성/텐션로스/스핀/비용), 기본값 이름순
- 공개 보유 스트링: 카드 상단 정렬 드롭다운 (이름순/브랜드순/가격 낮은순/가격 높은순), 기본값 이름순
- 검색·카테고리 필터와 정렬 파라미터 함께 유지
- 변경 파일: `src/routes/strings.tsx`, `src/routes/public.tsx`

## 다음 할 일 (Phase 이후 — 우선순위 낮음)

- [ ] 작업 이력 테이블에서 string_type 옆에 마스터 카테고리(폴리/천연거트 등) 뱃지 표시
- [ ] `/strings/:id` 단일 상세 페이지 (현재는 카드 상세 토글로 충분)
- [ ] 기존 `string_jobs.string_type` 데이터를 마스터와 일괄 매핑하는 일회성 스크립트 (필요 시)
- [ ] 운영 DB 마이그레이션 자동화 (GitHub Actions 등)
- [ ] 페이지네이션 UI 개선 (현재는 단순 이전/다음)
- [ ] 모바일 UI 최적화
- [ ] 스트링 재고 관리 (보유 수량, 소모 추적)

## 알려진 이슈 / 트랩

### Hono JSX `<script>` 자식 escape 문제 (해결됨)
- `<script>{JSON.stringify(...)}</script>`는 Hono JSX가 자식의 `"`를 `&quot;`로 HTML escape
- `<script>` 태그는 자동 디코딩 안 되므로 `JSON.parse` 실패
- **해결**: `<script dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />` 사용

### Drizzle 결과 객체의 plain 변환 (해결됨)
- `Record<number, any[]>`에 Drizzle select 결과를 직접 넣으면 JSX 직렬화 시 빈 객체로 변환될 수 있음
- **해결**: prop으로 넘기기 전 `allRacketsByCustomer`의 키를 `String(customerId)`로, 값도 명시적 plain object로 변환

### 라켓 동적 갱신 패턴
- 모든 고객의 라켓을 미리 로드 → 페이지에 JSON 임베드 → 클라이언트 JS가 select 변경 시 옵션 교체
- 같은 패턴을 스트링 datalist에도 적용 (작업 등록 시 자동완성)

## 환경 / 배포

- **로컬**: `npm run dev` → `http://127.0.0.1:8787`
- **로컬 DB 마이그레이션**: `npx wrangler d1 migrations apply stringing_history_db --local`
- **로컬 시드 적용**: `npm run db:seed:local`
- **로컬 DB 리셋**: `npm run db:reset:local`
- **운영 배포**: `npm run deploy` (Secret `ADMIN_PASSWORD` 사전 확인)
- **운영 DB 마이그레이션**: `npx wrangler d1 migrations apply stringing_history_db --remote`