import type { Context, MiddlewareHandler } from 'hono'
import { getDb } from '../db/client'
import { sessions } from '../db/schema'
import { eq, lt } from 'drizzle-orm'
import { parseCookie, buildCookie, safeEqual } from '../lib/auth'

export type AppEnv = {
  Bindings: Env // Env에 VIEWER_PASSWORD: string 추가 필요 (worker-configuration.d.ts 또는 타입 정의 파일)
  Variables: {
    isAdmin: boolean
    sessionId: string | null
  }
}

const VIEWER_SESSION_TTL_SECONDS = 60 * 60 * 24 // 1일 (요청 반영)

// ---- 관리자 로그인 레이트 리밋 ----
import { RATE_LIMIT } from '../lib/rateLimit'
export const loginRateLimiter = RATE_LIMIT.create(undefined, 5, 60_000) // KV 없어도 graceful 동작 (5회/60초)

// ---- 뷰어 인증 토큰 (비밀번호 원문 대신 HMAC 파생 토큰을 쿠키에 저장) ----
// 토큰 = HMAC-SHA256(key=VIEWER_PASSWORD, msg="viewer-site-auth-v1")
// - 원문이 쿠키에 노출되지 않음
// - 비밀번호 변경 시 토큰도 함께 변경되어 기존 쿠키 자동 무효화
async function viewerToken(expected: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(expected), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('viewer-site-auth-v1'))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---- 방문자(뷰어) 전체 비밀번호 인증 미들웨어 ----
// admin 세션이 있으면 자동 통과합니다.
export const siteAuthMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  // admin으로 이미 로그인된 경우 뷰어 게이트 자동 통과
  if (c.get('isAdmin')) {
    await next()
    return
  }

  // 로그인/로그아웃 페이지는 인증 제외
  const publicPaths = ['/login', '/logout']
  if (publicPaths.includes(c.req.path)) {
    await next()
    return
  }

  const cookie = c.req.header('cookie') ?? ''
  const auth = parseCookie(cookie, 'site_auth')
  const expected = c.env.VIEWER_PASSWORD ?? ''
  const expectedToken = expected ? await viewerToken(expected) : ''

  // 쿠키 값은 비밀번호 원문이 아닌 HMAC 파생 토큰이므로 안전하게(timing-safe) 비교합니다.
  if (!expectedToken || !auth || !safeEqual(auth, expectedToken)) {
    const url = new URL(c.req.url)
    const currentPath = c.req.path
    const fullPath = url.search ? `${currentPath}${url.search}` : currentPath
    return c.redirect(`/login?redirect=${encodeURIComponent(fullPath)}`)
  }
  await next()
}

// 로그인 처리 (비밀번호 검증 후 쿠키 설정)
export async function handleSiteLogin(c: Context<AppEnv>, password: string) {
  const expected = c.env.VIEWER_PASSWORD ?? ''
  if (expected && safeEqual(password, expected)) {
    // 쿠키에는 비밀번호 원문 대신 HMAC 파생 토큰을 저장합니다.
    const token = await viewerToken(expected)
    const secure = new URL(c.req.url).protocol === 'https:'
    c.header('Set-Cookie', buildCookie('site_auth', token, {
      maxAge: VIEWER_SESSION_TTL_SECONDS,
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    }))
    const redirect = safeRedirectPath(c.req.query('redirect'))
    return c.redirect(redirect)
  }
  return c.redirect('/login?error=1')
}

// 오픈 리다이렉트 방지: '/'로 시작하고 '//'로 시작하지 않는 내부 경로만 허용
function safeRedirectPath(path: string | undefined): string {
  if (!path) return '/'
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

async function isValidSession(d1: D1Database, sid: string): Promise<boolean> {
  const db = getDb(d1)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const rows = await db.select().from(sessions).where(eq(sessions.id, sid)).all()
  if (rows.length === 0) return false
  const exp = rows[0].expiresAt
  return exp > now
}

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('isAdmin', false)
  c.set('sessionId', null)
  const sid = parseCookie(c.req.header('cookie'), c.env.SESSION_COOKIE_NAME)
  if (sid) {
    if (await isValidSession(c.env.DB, sid)) {
      c.set('isAdmin', true)
      c.set('sessionId', sid)
    }
  }
  await next()
}

// 진짜 관리자 인증 - admin 라우트는 반드시 이 미들웨어를 써야 합니다.
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('isAdmin')) {
    const accept = c.req.header('accept') ?? ''
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      })
    }
    return c.redirect('/rhksflwk/login')
  }
  await next()
}

export async function cleanupExpiredSessions(d1: D1Database) {
  const db = getDb(d1)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.delete(sessions).where(lt(sessions.expiresAt, now)).run()
}