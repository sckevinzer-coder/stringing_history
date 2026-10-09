# 스트링 신청 기능 — 설계 문서

날짜: 2026-10-09 / 상태: 승인됨 (채팅 설계 합의)

## 1. 목적

고객이 보유 스트링 페이지에서 스트링을 보고 직접 작업 신청(스트링 + 텐션 지정)하거나,
품절 스트링에 대해 구매 요청을 보낼 수 있게 한다.
관리자는 신청 목록에서 1클릭으로 작업 이력으로 변환하고, 신규 신청은 GitHub 이슈
자동 생성 → 알림 메일로 인지한다.

## 2. 용어

- **작업 신청** (`type=job`): 보유 스트링 선택 + 텐션 지정 + 이름/라켓/희망날짜/메모
- **구매 요청** (`type=purchase`): 이름 + 스트링 선택(품절 포함) 또는 직접 입력 + 메모
- **신청** (`requests`): 위 둘을 합친 레코드. `status`: `new` → `done`(이력 변환) | `dismissed`(반려)

## 3. 데이터 모델 (migration 0006)

```sql
CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,            -- 'job' | 'purchase'
  customer_name TEXT NOT NULL,
  -- 작업 신청용
  string_id INTEGER REFERENCES strings(id) ON DELETE SET NULL,
  string_type TEXT,              -- 변환 시점 스냅샷 (FK 깨져도 표시 유지)
  tension_main REAL,
  tension_cross REAL,
  racket_model TEXT,
  job_date TEXT,                 -- 희망 날짜 (선택)
  -- 구매 요청용
  string_custom TEXT,            -- 목록에 없는 스트링 자유 입력
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'done' | 'dismissed'
  issue_number INTEGER,          -- GitHub 이슈 번호 (실패 시 NULL)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_type ON requests(type);
```

규칙:
- job: `string_id` 필수 (품절 `remaining_uses=0`은 폼에서 선택 불가), `tension_main` 필수
- purchase: `string_id` 또는 `string_custom` 중 하나 필수
- FK는 `ON DELETE SET NULL` + `string_type` 스냅샷으로 표시 유지

## 4. 신청 흐름 (고객 측, 뷰어 비밀번호 뒤)

- `/strings` 카드: **"신청"** 버튼 (job, 품절 시 비활성) + **"구매 요청"** 버튼
- 헤더 메뉴: "작업 신청" / "구매 요청" 링크 → 통합 폼 `/apply?type=job|purchase&string={id}`
- `POST /apply`: `requireString`/`numOrNull` 기존 검증 헬퍼 재사용 + 신청용 레이트리밋
  (기존 `loginRateLimiter` 패턴, 5회/60초 → 신청은 10회/10분 권장)
- 저장 후 확인 페이지 (토스트/문구: "신청이 접수되었습니다")

## 5. 알림 (GitHub 이슈 + 알림 메일)

- 접수 즉시 워커가 GitHub REST API 호출:
  `POST https://api.github.com/repos/sckevinzer-coder/stringing_history/issues`
  - 제목: `[작업신청] 홍길동 - 솔린코 Tour Bite` / `[구매요청] 홍길동 - Wilson NXT`
  - 본문: 신청 전체 정보 + 운영 URL 링크
- 신청 저장이 우선순위: API 실패해도 신청은 저장하고 `issue_number=NULL` (재시도 없음)
- 필요 시크릿: `GITHUB_TOKEN` (Issues 쓰기 권한) — Worker Secret, `Env` 타입 추가
- 메일 수신은 사용자 GitHub 계정 설정 필요: repo **Watch → Issues → Always** + 이메일 알림 ON
  (설정 안 하면 이슈는 쌓여도 메일 안 옴 — 배포 후 안내)

## 6. 관리 (관리자)

- `GET /rhksflwk/requests`: 신청 목록 (타입/상태 뱃지, 필터: 전체/신규/완료/반려)
- **"이력으로 등록"**: `GET /rhksflwk/new?request={id}` → JobForm 프리필
  (스트링·텐션·날짜·메모, 고객/라켓은 기존 선택 방식 유지 + 프리필 안내 배너)
  → `POST /rhksflwk/new` 성공 시 신청 `status=done` (request id hidden 필드로 전달)
- `dismissed` 처리 + 삭제 버튼
- 대시보드 상단 **"신규 신청 N건"** 뱃지 (`/rhksflwk/requests` 링크)

## 7. 남은횟수 연동

- 신청 시점에는 차감 없음 (실제 소모 아님)
- 이력 변환(등록) 시 기존 `consumeStringUse`가 그대로 차감
- 품절 스트링은 신청 폼에서 선택 불가 → 자연히 차감 대상에서 제외

## 8. 에러 처리

- 검증 실패: 400 + 기존 패턴의 에러 페이지/토스트
- GitHub API 실패: 로그 없이 조용히 저장 (운영 로그 `console.error` 1줄)
- 잘못된 `request` id로 변환 접근: 404

## 9. 테스트

- `npm run typecheck` + `npm run build` (dry-run)
- 로컬 검증: 신청 POST → DB 저장 확인, 변환 프리필 렌더 확인
  (GitHub API 실호출은 운영에서만 — 로컬은 `GITHUB_TOKEN` 미설정 시 스킵)
- 운영: 마이그레이션 → 배포 → 테스트 신청 1건 → 이슈/메일 확인

## 10. 범위 밖 (YAGNI)

- 고객 연락처, 신청 상태 고객 통보, 구매 수량, 수동 메일 발송
- 이슈 실패 재시도 큐
