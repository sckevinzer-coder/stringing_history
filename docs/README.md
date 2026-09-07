# 프로젝트 문서 인덱스

이 폴더는 본 프로젝트의 진행 상황, 작업 목록, 데이터 모델, API, UI 흐름을 정리한 문서입니다.
다른 에이전트/개발자가 이 문서만 읽어도 현재 상태와 다음 할 일을 파악할 수 있도록 작성되었습니다.

## 문서 목록

| 파일 | 내용 |
|---|---|
| `STATUS.md` | 현재까지 완료된 작업 / 다음 할 일 / 진행 중인 이슈 |
| `DATA_MODEL.md` | DB 스키마 정의 + 인덱스 + 마이그레이션 히스토리 |
| `API.md` | API 엔드포인트 목록 + 요청/응답 형식 |
| `UI.md` | 페이지/라우트 + 화면별 UX 흐름 |
| `DEPLOY.md` | 로컬/CI/배포 절차 + 환경 변수/시크릿 |

## 빠른 참조

- **소스 루트**: `src/`
- **마이그레이션**: `migrations/`
- **로컬 시드**: `seed.local.sql` (운영에는 적용 안 함)
- **Workers 이름**: `tennis` (`wrangler.toml`의 `name`)
- **운영 URL**: https://tennis.stringing.workers.dev
- **D1 DB**: `stringing_history_db` (id: `00d418f6-a0ec-488b-8cd8-88f56d0016fa`)
- **관리자 비밀번호**: `Epsltmdl1!` (Cloudflare Workers Secret `ADMIN_PASSWORD`에 저장)