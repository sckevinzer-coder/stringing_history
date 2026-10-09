# 배포 / 환경

## 로컬 개발

```bash
npm install
# .dev.vars 파일 확인 (ADMIN_PASSWORD 설정)
cat .dev.vars

# 로컬 DB 마이그레이션
npx wrangler d1 migrations apply stringing_history_db --local

# 로컬 DB 시드 (선택)
npm run db:seed:local

# 로컬 DB 리셋
npm run db:reset:local

# 개발 서버 시작
npm run dev
# → http://127.0.0.1:8787
```

`.dev.vars` 예시:
```
ADMIN_PASSWORD="admin1234"
```

## 환경 변수 / 시크릿

| 이름 | 종류 | 설명 | 설정 방법 |
|---|---|---|---|
| `ADMIN_PASSWORD` | Secret | 관리자 비밀번호 | `npx wrangler secret put ADMIN_PASSWORD` |
| `GITHUB_TOKEN` | Secret | 신청 접수 시 GitHub 이슈 자동 생성용 (Issues 쓰기 권한). 없으면 신청 저장만 되고 이슈는 스킵 | `npx wrangler secret put GITHUB_TOKEN` |
| `APP_NAME` | Vars | 사이트 이름 (헤더) | `wrangler.toml` `[vars]` 섹션 |
| `SESSION_COOKIE_NAME` | Vars | 세션 쿠키 이름 | `wrangler.toml` |
| `SESSION_TTL_SECONDS` | Vars | 세션 유효기간 (기본 30일) | `wrangler.toml` |

## 마이그레이션

```bash
# 새 마이그레이션 작성
# 파일명 형식: NNNN_description.sql
# 예: 0004_strings.sql

# 로컬 적용
npx wrangler d1 migrations apply stringing_history_db --local

# 운영 적용
npx wrangler d1 migrations apply stringing_history_db --remote
```

**중요**: 마이그레이션 파일 이름 순서대로 실행됩니다. 시드 데이터(`0002_seed.sql`)는 `seed.local.sql`로 이동시켜 운영 마이그레이션 목록에서 제외했습니다. 다시 추가하지 마세요 (운영 DB에 시드 데이터가 들어가면 사용자 입력과 충돌).

## 배포

```bash
# 시크릿 확인 (이미 설정되어 있어야 함)
npx wrangler secret list
# → ADMIN_PASSWORD 있어야 함

# wrangler.toml 확인
# - name = "tennis"
# - database_id = "00d418f6-a0ec-488b-8cd8-88f56d0016fa"

# 빌드 사전 검증
npx wrangler deploy --dry-run

# 배포
npm run deploy
# → https://tennis.stringing.workers.dev
```

## 트러블슈팅 체크리스트

### 라켓 select 동적 갱신이 안 됨
- 브라우저 캐시: 하드 리프레시 (Cmd+Shift+R) 또는 시크릿 창
- 콘솔에 `[jobs] customer change` 로그 확인
  - `keys: ["1"]`, `found: 2` → 정상
  - `keys: []` → 임베드된 JSON이 빈 객체 (Hono JSX escape 문제, `dangerouslySetInnerHTML` 사용)

### 로그인이 안 됨
- `npx wrangler secret list`로 `ADMIN_PASSWORD` 존재 확인
- 없다면 `npx wrangler secret put ADMIN_PASSWORD`로 설정
- Worker 이름이 바뀌었다면 새 Worker에도 시크릿을 다시 설정해야 함

### 마이그레이션 실패
- D1은 `d1_migrations` 테이블에 성공한 마이그레이션 이름만 기록
- 실패한 마이그레이션은 매번 재시도됨
- 해결: 실패 원인 수정 → 다시 `apply`
- 운영 DB에서 시드(`0002_seed.sql`)가 마이그레이션 폴더에 있으면 실패 → `seed.local.sql`로 이동

### D1 database_id 변경 시
- `wrangler.toml`의 `[[d1_databases]]` 블록의 `database_id` 수정
- 새 D1을 만들면 `npx wrangler d1 create <name>`로 ID 획득