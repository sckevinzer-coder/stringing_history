# 스트링 작업 이력 (Stringing History)

테니스 스트링 작업 이력을 기록·관리하고, 고객이 웹에서 열람할 수 있도록 하는 개인용 웹앱.
Hono + Cloudflare Workers + D1 + Drizzle ORM 으로 구현.

## 기능

- 공개 페이지: 최신순 작업 이력 목록 + 검색/필터 (고객명/라켓/스트링/메모 통합 텍스트, 스트링 종류, 날짜 범위, 텐션 범위) + 페이지네이션
- 관리자 페이지: 비밀번호 단일 계정 로그인 (세션 쿠키 + D1 저장)
- 관리자 CRUD: 고객 등록/열람, 라켓 등록, 작업 등록/수정/삭제
- JSON API: `/api/jobs`, `/api/customers`, `/api/customers/:id/rackets`, `/api/auth/login`, `/api/auth/logout`

## 디렉토리

```
src/
  index.ts            Hono 앱 엔트리
  middleware/auth.ts  세션·requireAdmin
  db/
      client.ts         drizzle ORM 클라이언트
      schema.ts        customers / rackets / string_jobs / sessions 스키마
  lib/
      auth.ts          토큰/쿠키 유틸 (timing-safe 비교)
      validation.ts    입력 검증/정규화/escapeHtml/JSON 에러 응답
  routes/
      api.ts           JSON API (/api/jobs, /api/customers, ...)
      auth.ts          /api/auth/login, /api/auth/logout
      public.tsx       공개 목록 페이지 (/)
      admin.tsx        관리자 페이지 (/admin/*)
  views/
      layout.tsx       공통 HTML 레이아웃
      JobForm.tsx      작업 등록/수정 폼
migrations/
  0001_init.sql        스키마 마이그레이션
  0002_seed.sql        로컬 개발용 시드 데이터
```

## 로컬 개발

```bash
npm install

# 1) 환경변수 설정 (.dev.vars) - 기본 비밀번호 admin1234
cat > .dev.vars <<'EOF'
ADMIN_PASSWORD="admin1234"
EOF

# 2) D1 마이그레이션 적용 + 시드
npx wrangler d1 migrations apply stringing_history_db --local

# 3) 개발 서버 시작
npm run dev
# -> http://127.0.0.1:8787
```

## 배포 (Cloudflare)

1. Cloudflare 계정에서 D1 데이터베이스 생성 후 database_id 를 `wrangler.toml`에 반영.
2. Cloudflare 대시보드(또는 `wrangler secret put ADMIN_PASSWORD`)에서 관리자 비밀번호 설정.
3. `npm run deploy` 로 Workers에 배포.
4. 실 DB에 마이그레이션 적용:

```bash
npx wrangler d1 migrations apply stringing_history_db --remote
```

## 환경 변수

| 이름 | 설명 | 기본 |
|---|---|---|
| `ADMIN_PASSWORD` | 관리자 비밀번호 | (필수, .dev.vars/secret 으로 주입) |
| `APP_NAME` | 헤더 타이틀 | `스트링 작업 이력` |
| `SESSION_COOKIE_NAME` | 세션 쿠키 이름 | `sh_session` |
| `SESSION_TTL_SECONDS` | 세션 유효기간(초) | `2592000` (30일) |

## API

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET    | `/api/jobs` | - | 작업 이력 목록 (q, string_type, date_from, date_to, tension_min, tension_max, limit, offset) |
| GET    | `/api/jobs/:id` | - | 작업 단건 |
| POST   | `/api/jobs` | 필요 | 작업 등록 (JSON) |
| PUT    | `/api/jobs/:id` | 필요 | 작업 수정 (JSON) |
| DELETE | `/api/jobs/:id` | 필요 | 작업 삭제 |
| GET    | `/api/customers?q=` | 필요 | 고객 검색 (자동완성용) |
| POST   | `/api/customers` | 필요 | 고객 등록 (JSON) |
| GET    | `/api/customers/:id` | 필요 | 고객 단건 |
| GET    | `/api/customers/:id/rackets` | 필요 | 라켓 목록 (드롭다운용) |
| POST   | `/api/customers/:id/rackets` | 필요 | 라켓 등록 (JSON) |
| POST   | `/api/auth/login` | - | 로그인 (form 또는 JSON) |
| POST   | `/api/auth/logout` | 필요 | 로그아웃 |

`Accept: application/json` 헤더가 있으면 JSON으로 응답하고, 없으면 302 리다이렉트(폼 페이지 흐름)합니다.