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
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>사이트 접속 - 스트링노트</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
        <div class="flex items-center gap-2 text-white">
          <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M7.5 9.5c2 1.5 2 4.7 4.5 6.5M16.5 9.5c-2 1.5-2 4.7-4.5 6.5" stroke-linecap="round"/>
          </svg>
          <h1 class="text-lg font-semibold">스트링노트</h1>
        </div>
      </div>
      <div class="px-6 py-5">
        ${error ? '<div class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-start gap-2"><svg class="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg><span>비밀번호가 올바르지 않습니다.</span></div>' : ''}
        <form method="post" action="/login" class="flex flex-col gap-4">
          <input type="hidden" name="redirect" value="${redirect}" />
          <div class="flex flex-col">
            <label for="password" class="text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
            <input
              id="password"
              type="password"
              name="password"
              autofocus
              required
              placeholder="비밀번호를 입력하세요"
              autocomplete="current-password"
              class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                     placeholder:text-slate-400 transition-shadow duration-150"
            />
          </div>
          <button
            type="submit"
            class="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                   text-white font-medium rounded-lg px-4 py-2.5 text-sm
                   shadow-sm hover:shadow transition-all duration-150
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            접속하기
          </button>
        </form>
        <p class="mt-4 text-xs text-slate-500 text-center">
          스트링 작업 이력 조회 서비스입니다. 비밀번호로 보호되어 있습니다.
        </p>
      </div>
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
