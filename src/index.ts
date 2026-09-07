import { Hono } from 'hono'
import type { AppEnv } from './middleware/auth'
import { sessionMiddleware, siteAuthMiddleware, handleSiteLogin, cleanupExpiredSessions } from './middleware/auth'
import { api } from './routes/api'
import { authApi } from './routes/auth'
import { publicRoutes } from './routes/public'
import { adminRoutes } from './routes/admin'
import { stringsRoutes } from './routes/strings'
import { getDb } from './db/client'
import { sessions } from './db/schema'
import { eq } from 'drizzle-orm'

const app = new Hono<AppEnv>()

app.use('*', sessionMiddleware)

app.get('/health', (c) => c.json({ ok: true }))

// API 라우트
app.route('/api', api)
app.route('/api/auth', authApi)

// 로그인 페이지 (전체 비밀번호 입력)
app.get('/login', (c) => {
  const url = new URL(c.req.url)
  const error = url.searchParams.get('error') === '1'
  const redirect = url.searchParams.get('redirect') ?? '/'
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>사이트 접속 - 텐nis</title></head>
<body class="bg-slate-50">
  <div class="flex min-h-screen items-center justify-center">
    <div class="bg-white border border-slate-200 rounded-lg p-6 w-80">
      <h1 class="text-lg font-semibold mb-4">사이트 접속</h1>
      ${error ? '<div class="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">비밀번호가 올바르지 않습니다.</div>' : ''}
      <form method="post" action="/login" class="flex flex-col gap-3">
        <input type="hidden" name="redirect" value="${redirect}" />
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">비밀번호</span>
          <input type="password" name="password" autofocus required class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">접속</button>
      </form>
    </div>
  </div>
</body>
</html>`)
})

// 로그인 처리 (POST)
app.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const password = String(body.password ?? '')
  // 만료된 세션 레코드 정리 (응답과 무관하게 백그라운드 실행)
  c.executionCtx.waitUntil(cleanupExpiredSessions(c.env.DB))
  return handleSiteLogin(c, password)
})

// 로그아웃 (관리자 세션 + 뷰어 쿠키 모두 삭제)
app.get('/logout', async (c) => {
  const sid = c.get('sessionId')
  if (sid) {
    try {
      const db = getDb(c.env.DB)
      await db.delete(sessions).where(eq(sessions.id, sid)).run()
    } catch { /* 세션 삭제 실패해도 로그아웃 진행 */ }
  }
    c.header('Set-Cookie', `${c.env.SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`)
  c.header('Set-Cookie', 'site_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax', { append: true })
  return c.redirect('/login')
})

// 페이지 라우트
app.route('/rhksflwk', adminRoutes)    // 관리자 (비밀번호 인증 필요, 경로: /rhksflwk)
app.route('/rhksflwk/strings', stringsRoutes)  // 스트링 마스터 관리
app.route('/', publicRoutes)          // 작업 이력 (비밀번호 인증 필요)
app.route('/strings', publicRoutes)   // 보조 스트링 목록 (publicRoutes에서 처리)

// 404
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  return c.text('404 Not Found', 404)
})

// 에러 핸들러 (내부 정보 노출 차단)
app.onError((err, c) => {
  console.error(err)
  if (c.req.path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  return c.text('서버 오류가 발생했습니다.', 500)
})

export default app