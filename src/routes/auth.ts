import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { AppEnv } from '../middleware/auth'
import { requireAdmin } from '../middleware/auth'
import { getDb } from '../db/client'
import { sessions } from '../db/schema'
import { randomToken, safeEqual, buildCookie, clearCookie } from '../lib/auth'

export const authApi = new Hono<AppEnv>()

authApi.post('/login', async (c) => {
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  const password = typeof body.password === 'string' ? body.password : ''
  const expected = c.env.ADMIN_PASSWORD ?? ''
  if (!safeEqual(password, expected)) {
    // POST 후 redirect 방식 - 에러는 쿼리로 전달
    const accept = c.req.header('accept') ?? ''
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ error: '비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      })
    }
    return c.redirect('/rhksflwk/login?error=1')
  }

  // 세션 생성
  const ttl = Number(c.env.SESSION_TTL_SECONDS ?? '2592000')
  const sid = randomToken(32)
  const now = new Date()
  const exp = new Date(now.getTime() + ttl * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

  const db = getDb(c.env.DB)
  await db.insert(sessions).values({
    id: sid,
    createdAt: fmt(now),
    expiresAt: fmt(exp),
  }).run()

  const cookie = buildCookie(c.env.SESSION_COOKIE_NAME, sid, {
    maxAge: ttl,
    httpOnly: true,
    secure: c.req.url.startsWith('https://'),
    sameSite: 'Lax',
  })
  const accept2 = c.req.header('accept') ?? ''
  if (accept2.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'set-cookie': cookie },
    })
  }
  return new Response(null, {
    status: 303,
    headers: {
      'location': '/rhksflwk',
      'set-cookie': cookie,
    },
  })
})

authApi.post('/logout', requireAdmin, async (c) => {
  const sid = c.get('sessionId')
  if (sid) {
    const db = getDb(c.env.DB)
    await db.delete(sessions).where(eq(sessions.id, sid)).run()
  }
    const cookie = clearCookie(c.env.SESSION_COOKIE_NAME)
  const accept = c.req.header('accept') ?? ''
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'set-cookie': cookie },
    })
  }
  return new Response(null, { status: 303, headers: { 'location': '/', 'set-cookie': cookie } })
})