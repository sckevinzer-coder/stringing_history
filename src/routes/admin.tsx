import { Hono } from 'hono'
import type { AppEnv } from '../middleware/auth'
//import { siteAuthMiddleware } from '../middleware/auth'
import { requireAdmin, loginRateLimiter } from '../middleware/auth'
import { Layout } from '../views/layout'
import { JobForm } from '../views/JobForm'
import { getDb } from '../db/client'
import { customers, rackets, stringJobs, strings } from '../db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import { escapeHtml, ValidationError, requireString, toDateOrThrow, toNumberOrNull, numOrNull } from '../lib/validation'
import { sessions } from '../db/schema'
import { buildCookie } from '../lib/auth'

// Toast 리다이렉트 헬퍼
function toastRedirect(path: string, msg: string, type: 'success' | 'error' = 'success') {
  const params = new URLSearchParams({ toast: type, msg })
  return c_redirect(`${path}?${params.toString()}`)
}
// c.redirect 별칭 (c 객체 없이 사용하기 위해)
function c_redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } })
}

export const adminRoutes = new Hono<AppEnv>()

// 로그인 페이지 (인증 없이 접근 가능 - 미들웨어보다 먼저 등록)
adminRoutes.get('/login', (c) => {
  if (c.get('isAdmin')) return c.redirect('/rhksflwk')
  const url = new URL(c.req.url)
  const error = url.searchParams.get('error') === '1'
  return c.html(
    <Layout title="관리자 로그인" isAdmin={false} appName={c.env.APP_NAME}>
      <section class="max-w-sm mx-auto bg-white border border-slate-200 rounded-lg p-6 mt-10">
        <h1 class="text-lg font-semibold mb-4">관리자 로그인</h1>
        {error && (
          <div class="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            비밀번호가 올바르지 않습니다.
          </div>
        )}
        <form method="post" action="/rhksflwk/login" class="flex flex-col gap-3">
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">아이디</span>
            <input type="text" name="admin_id" placeholder="아이디 입력" class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">비밀번호</span>
            <input type="password" name="password" autofocus required class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">로그인</button>
        </form>
        <p class="mt-3 text-xs text-slate-500">관리자 전용 페이지입니다.</p>
      </section>
    </Layout>,
  )
})

// 로그인 처리 (POST) - 인증 없이 접근 가능
adminRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const adminId = String(body.admin_id ?? '')
  const password = String(body.password ?? '')
    const ADMIN_ID = c.env.ADMIN_ID
  const ADMIN_PASSWORD = c.env.ADMIN_PASSWORD

  // 무차별 대입 방어: 5회 실패 시 60초 잠금
  if (!(await loginRateLimiter.try(`admin:${adminId}`))) {
    return c.redirect('/rhksflwk/login?error=locked')
  }

  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
    // 성공 시 실패 카운터 리셋
    await loginRateLimiter.reset(`admin:${adminId}`)
    const sid = crypto.randomUUID()
    const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const db = getDb(c.env.DB)
    // 단일 세션 정책: 새 로그인 시 기존 세션을 모두 무효화 (다른 기기 로그아웃)
    await db.delete(sessions).run()
    await db.insert(sessions).values({ id: sid, expiresAt: exp }).run()
    const secure = new URL(c.req.url).protocol === 'https:'
    const cookie = buildCookie(c.env.SESSION_COOKIE_NAME, sid, {
      maxAge: 600,
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    })
    return new Response(null, {
      status: 302,
      headers: { Location: '/rhksflwk', 'Set-Cookie': cookie },
    })
  }
  return c.redirect('/rhksflwk/login?error=1')
})

// 이하 페이지는 관리자 인증 필요
adminRoutes.use('/*', requireAdmin)
//adminRoutes.use('/*', siteAuthMiddleware)

// 대시보드 (작업 이력 목록 + 관리 메뉴)
adminRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const jobs = await db
    .select({
      id: stringJobs.id,
      jobDate: stringJobs.jobDate,
      stringType: stringJobs.stringType,
      tensionMain: stringJobs.tensionMain,
      tensionCross: stringJobs.tensionCross,
      cutLengthMain: stringJobs.cutLengthMain,
      cutLengthCross: stringJobs.cutLengthCross,
      price: stringJobs.price,
      memo: stringJobs.memo,
      racketModel: rackets.racketModel,
      racketNickname: rackets.nickname,
      racketHeadSize: rackets.headSize,
      racketStringPattern: rackets.stringPattern,
      customerId: customers.id,
      customerName: customers.name,
    })
    .from(stringJobs)
    .innerJoin(rackets, eq(rackets.id, stringJobs.racketId))
    .innerJoin(customers, eq(customers.id, rackets.customerId))
    .orderBy(desc(stringJobs.jobDate), desc(stringJobs.id))
    .limit(100)
    .all()

  return c.html(
    <Layout title="관리자 대시보드" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">관리자 대시보드</h1>
        <nav class="flex gap-2 text-sm">
          <a href="/rhksflwk/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">+ 작업 등록</a>
          <a href="/rhksflwk/strings" class="bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded">스트링 관리</a>
          <a href="/rhksflwk/customers" class="bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded">고객 관리</a>
        </nav>
      </div>
      <p class="text-sm text-slate-600 mb-4">최근 등록된 작업 이력 (최대 100건)</p>
            {jobs.length === 0 ? (
        <div class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          등록된 작업이 없습니다. 우측 상단의 "+ 작업 등록"을 눌러 시작하세요.
        </div>
      ) : (
        <div class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-100 text-slate-700">
              <tr>
                <th class="text-left px-3 py-2">작업일</th>
                <th class="text-left px-3 py-2">고객</th>
                <th class="text-left px-3 py-2">라켓 (헤드 / 패턴)</th>
                <th class="text-left px-3 py-2">스트링</th>
                <th class="text-right px-3 py-2">텐션 (m/c)</th>
                <th class="text-right px-3 py-2">컷 길이</th>
                <th class="text-right px-3 py-2">비용</th>
                <th class="text-right px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td class="px-3 py-2 whitespace-nowrap">{j.jobDate}</td>
                  <td class="px-3 py-2 whitespace-nowrap">{escapeHtml(j.customerName)}</td>
                  <td class="px-3 py-2">
                    <div>{escapeHtml(j.racketModel)}{j.racketNickname && <span class="text-xs text-slate-500"> ({escapeHtml(j.racketNickname)})</span>}</div>
                    <div class="text-xs text-slate-500">
                      {j.racketHeadSize != null ? `${j.racketHeadSize} sq.in` : '-'}{j.racketStringPattern ? ` · ${escapeHtml(j.racketStringPattern)}` : ''}
                    </div>
                  </td>
                  <td class="px-3 py-2">{escapeHtml(j.stringType)}</td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    {j.tensionMain ?? '-'}{j.tensionCross != null ? ` / ${j.tensionCross}` : ''}
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    {j.cutLengthMain ?? '-'}{j.cutLengthCross != null ? ` / ${j.cutLengthCross}` : ''}
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">{j.price != null ? `${j.price.toLocaleString('ko-KR')}원` : '-'}</td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <a href={`/rhksflwk/new?copy=${j.id}`} class="text-emerald-600 hover:underline" title="이 작업 내용을 복사해 새 이력 등록">복사</a>
                    <a href={`/rhksflwk/edit/${j.id}`} class="text-blue-600 hover:underline ml-2">수정</a>
                    <form method="post" action={`/rhksflwk/jobs/${j.id}/duplicate`} class="inline" onsubmit="return confirm('이 작업을 오늘 날짜로 바로 등록하시겠습니까?')">
                      <button class="text-emerald-700 hover:underline ml-2">빠른등록</button>
                    </form>
                    <form method="post" action={`/rhksflwk/jobs/${j.id}/delete`} class="inline" onsubmit="return confirm('정말 삭제하시겠습니까?')">
                      <button class="text-red-600 hover:underline ml-2">삭제</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>,
  )
})

// 고객 관리 목록
adminRoutes.get('/customers', async (c) => {
  const db = getDb(c.env.DB)
  const allCustomers = await db.select().from(customers).orderBy(customers.name).all()

  // 각 고객별 라켓 수 집계
  const allRackets = await db.select({
    id: rackets.id,
    customerId: rackets.customerId,
    racketModel: rackets.racketModel,
    nickname: rackets.nickname,
  }).from(rackets).all()
  const byCustomer = new Map<number, typeof allRackets>()
  for (const r of allRackets) {
    if (!byCustomer.has(r.customerId)) byCustomer.set(r.customerId, [])
    byCustomer.get(r.customerId)!.push(r)
  }

  return c.html(
    <Layout title="고객 관리" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">고객 관리</h1>
        <a href="/rhksflwk" class="text-sm text-slate-600 hover:text-blue-600">← 대시보드</a>
      </div>

      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <h2 class="font-semibold mb-2">신규 고객 등록</h2>
        <form method="post" action="/rhksflwk/customers" class="flex gap-2">
          <input name="name" required placeholder="고객명" class="flex-1 border border-slate-300 rounded px-3 py-2 text-sm" />
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">등록</button>
        </form>
      </section>

            <section class="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-100 text-slate-700">
            <tr>
              <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">ID</th>
              <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">고객명</th>
              <th class="text-right px-3 py-2 hover:bg-slate-200 cursor-pointer">라켓 수</th>
              <th class="text-right px-3 py-2 hover:bg-slate-200 cursor-pointer">관리</th>
            </tr>
          </thead>
          <tbody>
            {allCustomers.length === 0 ? (
              <tr><td colspan={4} class="px-3 py-6 text-center text-slate-500">등록된 고객이 없습니다.</td></tr>
            ) : (
              allCustomers.map((c2) => (
                <tr class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td class="px-3 py-2">{c2.id}</td>
                  <td class="px-3 py-2">{escapeHtml(c2.name)}</td>
                  <td class="px-3 py-2 text-right">{(byCustomer.get(c2.id) ?? []).length}</td>
                  <td class="px-3 py-2 text-right">
                    <a href={`/rhksflwk/customers/${c2.id}`} class="text-blue-600 hover:underline">상세</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Layout>,
  )
})

// 신규 고객 등록 처리
adminRoutes.post('/customers', async (c) => {
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  const name = requireString(body.name, '고객명')
  const db = getDb(c.env.DB)
  await db.insert(customers).values({ name }).run()
  return toastRedirect('/rhksflwk/customers', `${name} 고객이 등록되었습니다.`)
})

// 고객 상세 (라켓 목록)
adminRoutes.get('/customers/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const customer = await db.select().from(customers).where(eq(customers.id, id)).all()
  if (customer.length === 0) return c.notFound()
  const cust = customer[0]

  const rackList = await db.select().from(rackets).where(eq(rackets.customerId, id)).orderBy(rackets.id).all()

  return c.html(
    <Layout title={`${cust.name} - 고객 상세`} isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">고객: {escapeHtml(cust.name)}</h1>
        <a href="/rhksflwk/customers" class="text-sm text-slate-600 hover:text-blue-600">← 고객 목록</a>
      </div>

      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <h2 class="font-semibold mb-2">신규 라켓 등록</h2>
        <form method="post" action={`/rhksflwk/customers/${id}/rackets`} class="grid gap-2 md:grid-cols-4">
          <input name="racket_model" required placeholder="라켓 모델명" class="md:col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <input name="nickname" placeholder="별칭 (선택)" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <input name="head_size" type="number" step="0.1" placeholder="헤드사이즈 (sq.in)" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <input name="string_pattern" placeholder="스트링 패턴 (예: 16x19)" class="md:col-span-4 border border-slate-300 rounded px-3 py-2 text-sm" />
          <button class="md:col-span-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm w-fit">등록</button>
        </form>
      </section>

      <section class="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table class="min-w-full text-sm">
                    <thead class="bg-slate-100 text-slate-700">
            <tr>
              <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">ID</th>
              <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">모델명</th>
              <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">별칭</th>
              <th class="text-right px-3 py-2 hover:bg-slate-200 cursor-pointer">헤드사이즈</th>
              <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">스트링 패턴</th>
              <th class="text-right px-3 py-2 hover:bg-slate-200 cursor-pointer">관리</th>
            </tr>
          </thead>
          <tbody>
            {rackList.length === 0 ? (
              <tr><td colspan={6} class="px-3 py-6 text-center text-slate-500">등록된 라켓이 없습니다.</td></tr>
            ) : (
              rackList.map((r) => (
                                <tr class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td class="px-3 py-2">{escapeHtml(r.racketModel)}</td>
                  <td class="px-3 py-2">{r.nickname ? escapeHtml(r.nickname) : '-'}</td>
                  <td class="px-3 py-2 text-right">{r.headSize != null ? `${r.headSize} sq.in` : '-'}</td>
                  <td class="px-3 py-2">{r.stringPattern ? escapeHtml(r.stringPattern) : '-'}</td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <a href={`/rhksflwk/rackets/${r.id}/edit`} class="text-blue-600 hover:underline">수정</a>
                    <form method="post" action={`/rhksflwk/rackets/${r.id}/delete`} class="inline" onsubmit="return confirm('이 라켓과 연결된 모든 작업 이력이 삭제됩니다. 계속하시겠습니까?')">
                      <button class="text-red-600 hover:underline ml-2">삭제</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p class="mt-4 text-sm">
        <a href={`/rhksflwk/new?customer_id=${id}`} class="text-blue-600 hover:underline">+ 이 고객의 새 작업 등록</a>
      </p>
    </Layout>,
  )
})

// 라켓 등록 처리
adminRoutes.post('/customers/:id/rackets', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  const racketModel = requireString(body.racket_model, '라켓 모델')
  const nickname = body.nickname ? String(body.nickname).trim() || null : null
  const headSize = numOrNull(body.head_size)
  const stringPattern = body.string_pattern ? String(body.string_pattern).trim() || null : null
  const db = getDb(c.env.DB)
  await db.insert(rackets).values({
    customerId: id, racketModel, nickname, headSize, stringPattern,
  }).run()
  return toastRedirect(`/rhksflwk/customers/${id}`, `라켓 "${racketModel}"이 등록되었습니다.`)
})

// ----- 라켓 수정 (GET) -----
adminRoutes.get('/rackets/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const rows = await db.select().from(rackets).where(eq(rackets.id, id)).all()
  if (rows.length === 0) return c.notFound()
  const r = rows[0]

  return c.html(
    <Layout title="라켓 정보 수정" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">라켓 정보 수정</h1>
        <a href={`/rhksflwk/customers/${r.customerId}`} class="text-sm text-slate-600 hover:text-blue-600">← 고객 상세</a>
      </div>
      <form method="post" action={`/rhksflwk/rackets/${id}/edit`} class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="flex flex-col text-sm md:col-span-2">
            <span class="text-slate-600 mb-1">모델명 <span class="text-red-500">*</span></span>
            <input name="racket_model" required value={escapeHtml(r.racketModel)} class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">별칭 (선택)</span>
            <input name="nickname" value={r.nickname ? escapeHtml(r.nickname) : ''} placeholder="예: 1번 라켓" class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">헤드사이즈 (sq.in)</span>
            <input type="number" step="0.1" name="head_size" value={r.headSize ?? ''} class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm md:col-span-2">
            <span class="text-slate-600 mb-1">스트링 패턴</span>
            <input name="string_pattern" value={r.stringPattern ? escapeHtml(r.stringPattern) : ''} placeholder="예: 16x19" class="border border-slate-300 rounded px-3 py-2" />
          </label>
        </div>
        <p class="text-xs text-slate-500">라켓 모델명/별칭/헤드사이즈/스트링패턴을 수정합니다. 이 라켓과 연결된 작업 이력은 그대로 유지됩니다.</p>
        <div class="flex gap-2">
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">수정 저장</button>
          <a href={`/rhksflwk/customers/${r.customerId}`} class="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">취소</a>
        </div>
      </form>
    </Layout>,
  )
})

// ----- 라켓 수정 (POST) -----
adminRoutes.post('/rackets/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  try {
    const racketModel = requireString(body.racket_model, '라켓 모델')
    const nickname = body.nickname ? String(body.nickname).trim() || null : null
    const headSize = numOrNull(body.head_size)
    const stringPattern = body.string_pattern ? String(body.string_pattern).trim() || null : null
    const db = getDb(c.env.DB)
    const res = await db.update(rackets).set({
      racketModel, nickname, headSize, stringPattern,
    }).where(eq(rackets.id, id)).returning({ id: rackets.id, customerId: rackets.customerId }).all()
    if (res.length === 0) return c.notFound()
    return toastRedirect(`/rhksflwk/customers/${res[0].customerId}`, `라켓 정보가 수정되었습니다.`)
  } catch (e: any) {
    if (e instanceof ValidationError) {
      return c.html(
        <Layout title="라켓 정보 수정" isAdmin={true} appName={c.env.APP_NAME}>
          <div class="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 mb-4 text-sm">{escapeHtml(e.message)}</div>
          <a href={`/rhksflwk/rackets/${id}/edit`} class="text-blue-600 hover:underline text-sm">← 다시 작성</a>
        </Layout>,
        400,
      )
    }
    return c.text('수정 실패: 서버 오류가 발생했습니다.', 500)
  }
})

// ----- 라켓 삭제 (POST) -----
adminRoutes.post('/rackets/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const res = await db.delete(rackets).where(eq(rackets.id, id)).returning({ id: rackets.id, customerId: rackets.customerId }).all()
  if (res.length === 0) return c.notFound()
  return toastRedirect(`/rhksflwk/customers/${res[0].customerId}`, `라켓이 삭제되었습니다.`)
})

// ----- 작업 신규 등록 폼 (GET) -----
adminRoutes.get('/new', async (c) => {
  const url = new URL(c.req.url)
  const presetCustomerId = numOrNull(url.searchParams.get('customer_id'))
  const copyId = numOrNull(url.searchParams.get('copy'))
  const db = getDb(c.env.DB)
  // 복사 모드: 기존 작업 1건을 조회해 폼 프리필 (날짜는 오늘로)
  let copyJob: {
    customerId: number; customerName: string | null
    racketId: number; stringType: string; stringId: number | null
    tensionMain: number | null; tensionCross: number | null
    cutLengthMain: number | null; cutLengthCross: number | null
    price: number | null; memo: string | null
  } | null = null
  if (copyId != null) {
    const rows = await db
      .select({
        customerId: rackets.customerId, customerName: customers.name,
        racketId: stringJobs.racketId, stringType: stringJobs.stringType, stringId: stringJobs.stringId,
        tensionMain: stringJobs.tensionMain, tensionCross: stringJobs.tensionCross,
        cutLengthMain: stringJobs.cutLengthMain, cutLengthCross: stringJobs.cutLengthCross,
        price: stringJobs.price, memo: stringJobs.memo,
      })
      .from(stringJobs)
      .innerJoin(rackets, eq(stringJobs.racketId, rackets.id))
      .innerJoin(customers, eq(rackets.customerId, customers.id))
      .where(eq(stringJobs.id, copyId))
      .limit(1)
      .all()
    if (rows.length > 0) copyJob = rows[0]
  }
  const allCustomersRaw = await db.select().from(customers).orderBy(customers.name).all()
  const allRacketsRaw = await db.select().from(rackets).orderBy(rackets.id).all()
  // Drizzle 결과 객체를 명시적으로 plain object로 변환
  const allCustomers = allCustomersRaw.map((c) => ({ id: c.id, name: c.name }))
  const allRacketsByCustomer: Record<string, any[]> = {}
  for (const r of allRacketsRaw) {
    const k = String(r.customerId)
    if (!allRacketsByCustomer[k]) allRacketsByCustomer[k] = []
    allRacketsByCustomer[k].push({
      id: r.id,
      customerId: r.customerId,
      racketModel: r.racketModel,
      nickname: r.nickname,
      headSize: r.headSize,
      stringPattern: r.stringPattern,
    })
  }
  const effectivePresetCustomerIdRaw = copyJob?.customerId ?? presetCustomerId
  const presetRackets = effectivePresetCustomerIdRaw != null
    ? (allRacketsByCustomer[String(effectivePresetCustomerIdRaw)] ?? [])
    : []

  const masterStringsRaw = await db
    .select({ id: strings.id, brand: strings.brand, name: strings.name, gauge: strings.gauge })
    .from(strings)
    .orderBy(asc(strings.brand), asc(strings.name))
    .all()
  const masterStrings = masterStringsRaw.map((m) => ({ id: m.id, brand: m.brand, name: m.name, gauge: m.gauge }))

  const effectivePresetCustomerName = copyJob?.customerName ?? null
  const copyToday = new Date().toISOString().slice(0, 10)

  return c.html(
    <Layout title={copyJob ? '작업 복사 등록' : '작업 등록'} isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">{copyJob ? '작업 복사 등록' : '새 작업 등록'}</h1>
        <a href="/rhksflwk" class="text-sm text-slate-600 hover:text-blue-600">← 대시보드</a>
      </div>
      {copyJob && (
        <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-3 py-2 mb-4 text-sm">
          이전 작업 내용을 복사했습니다. 날짜는 오늘로 설정되어 있습니다. 라켓/스트링 등 변경 후 등록하세요.
        </div>
      )}
      <JobForm
        customers={allCustomers}
        presetCustomerId={effectivePresetCustomerIdRaw}
        presetCustomerName={effectivePresetCustomerName}
        presetRackets={presetRackets}
        allRacketsByCustomer={allRacketsByCustomer}
        masterStrings={masterStrings}
        isEdit={false}
        values={copyJob ? {
          racketId: copyJob.racketId,
          stringType: copyJob.stringType,
          stringId: copyJob.stringId,
          tensionMain: copyJob.tensionMain,
          tensionCross: copyJob.tensionCross,
          cutLengthMain: copyJob.cutLengthMain,
          cutLengthCross: copyJob.cutLengthCross,
          jobDate: copyToday,
          price: copyJob.price,
          memo: copyJob.memo,
        } : undefined}
      />
    </Layout>,
  )
})

// ----- 작업 신규 등록 처리 (POST) -----
adminRoutes.post('/new', async (c) => {
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  try {
    const db = getDb(c.env.DB)
    let racketId = numOrNull(body.racket_id)
    let customerId = numOrNull(body.customer_id)

    // 신규 고객 인라인 등록
    const newCustomerName = typeof body.new_customer_name === 'string' ? body.new_customer_name.trim() : ''
    if (!customerId && newCustomerName) {
      const existing = await db.select({ id: customers.id }).from(customers).where(eq(customers.name, newCustomerName)).all()
      if (existing.length > 0) {
        customerId = existing[0].id
      } else {
        const ins = await db.insert(customers).values({ name: newCustomerName }).returning({ id: customers.id }).all()
        customerId = ins[0].id
      }
    }

    const newRacketModel = typeof body.new_racket_model === 'string' ? body.new_racket_model.trim() : ''
    if (!racketId && newRacketModel) {
      if (!customerId) throw new ValidationError('신규 라켓 등록 시 고객을 선택해야 합니다.')
      const cust = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).all()
      if (cust.length === 0) throw new ValidationError('선택한 고객을 찾을 수 없습니다.')
      const nickname = typeof body.new_racket_nickname === 'string' ? body.new_racket_nickname.trim() || null : null
      const newHeadSize = numOrNull(body.new_head_size)
      const newStringPattern = body.new_string_pattern ? String(body.new_string_pattern).trim() || null : null
      const ins = await db.insert(rackets).values({
        customerId,
        racketModel: newRacketModel,
        nickname,
        headSize: newHeadSize,
        stringPattern: newStringPattern,
      }).returning().all()
      racketId = ins[0].id
    }
    if (!racketId) throw new ValidationError('라켓을 선택하거나 신규 등록 정보를 입력하세요.')
    if (!customerId) {
      const r = await db.select({ cid: rackets.customerId }).from(rackets).where(eq(rackets.id, racketId)).all()
      customerId = r[0]?.cid ?? null
    }

    const stringType = requireString(body.string_type, '스트링 종류')
    const jobDate = toDateOrThrow(body.job_date, '작업일')

    const insert = {
      racketId,
      stringType,
      stringId: numOrNull(body.string_id),
      tensionMain: toNumberOrNull(body.tension_main),
      tensionCross: toNumberOrNull(body.tension_cross),
      cutLengthMain: toNumberOrNull(body.cut_length_main),
      cutLengthCross: toNumberOrNull(body.cut_length_cross),
      jobDate,
      price: toNumberOrNull(body.price),
      memo: body.memo ? String(body.memo).trim() || null : null,
    }
    await db.insert(stringJobs).values(insert).run()
    return toastRedirect('/rhksflwk', '작업이 등록되었습니다.')
  } catch (e: any) {
    if (e instanceof ValidationError) {
      return c.html(
        <Layout title="작업 등록" isAdmin={true} appName={c.env.APP_NAME}>
          <div class="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 mb-4 text-sm">{escapeHtml(e.message)}</div>
          <a href="/rhksflwk/new" class="text-blue-600 hover:underline text-sm">← 다시 작성</a>
        </Layout>,
        400,
      )
    }
    return c.text('등록 실패: 서버 오류가 발생했습니다.', 500)
  }
})

// ----- 작업 수정 폼 (GET) -----
adminRoutes.get('/edit/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const jobRows = await db
    .select({
      id: stringJobs.id,
      jobDate: stringJobs.jobDate,
      stringType: stringJobs.stringType,
      stringId: stringJobs.stringId,
      tensionMain: stringJobs.tensionMain,
      tensionCross: stringJobs.tensionCross,
      cutLengthMain: stringJobs.cutLengthMain,
      cutLengthCross: stringJobs.cutLengthCross,
      price: stringJobs.price,
      memo: stringJobs.memo,
      racketId: stringJobs.racketId,
      customerId: customers.id,
      customerName: customers.name,
    })
    .from(stringJobs)
    .innerJoin(rackets, eq(rackets.id, stringJobs.racketId))
    .innerJoin(customers, eq(customers.id, rackets.customerId))
    .where(eq(stringJobs.id, id))
    .all()
  if (jobRows.length === 0) return c.notFound()
  const job = jobRows[0]
  const allCustomersRaw = await db.select().from(customers).orderBy(customers.name).all()
  const allRacketsRaw = await db.select().from(rackets).orderBy(rackets.id).all()
  const allCustomers = allCustomersRaw.map((c) => ({ id: c.id, name: c.name }))
  const allRacketsByCustomer: Record<string, any[]> = {}
  for (const r of allRacketsRaw) {
    const k = String(r.customerId)
    if (!allRacketsByCustomer[k]) allRacketsByCustomer[k] = []
    allRacketsByCustomer[k].push({
      id: r.id,
      customerId: r.customerId,
      racketModel: r.racketModel,
      nickname: r.nickname,
      headSize: r.headSize,
      stringPattern: r.stringPattern,
    })
  }
  const rackList = allRacketsByCustomer[String(job.customerId)] ?? []

  const masterStringsRaw = await db
    .select({ id: strings.id, brand: strings.brand, name: strings.name, gauge: strings.gauge })
    .from(strings)
    .orderBy(asc(strings.brand), asc(strings.name))
    .all()
  const masterStrings = masterStringsRaw.map((m) => ({ id: m.id, brand: m.brand, name: m.name, gauge: m.gauge }))

  return c.html(
    <Layout title="작업 수정" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">작업 수정 #{job.id}</h1>
        <a href="/rhksflwk" class="text-sm text-slate-600 hover:text-blue-600">← 대시보드</a>
      </div>
      <JobForm
        customers={allCustomers}
        presetCustomerId={job.customerId}
        presetCustomerName={job.customerName}
        presetRackets={rackList}
        allRacketsByCustomer={allRacketsByCustomer}
        masterStrings={masterStrings}
        isEdit={true}
        editId={job.id}
        values={{
          racketId: job.racketId,
          stringType: job.stringType,
          stringId: job.stringId,
          tensionMain: job.tensionMain,
          tensionCross: job.tensionCross,
          cutLengthMain: job.cutLengthMain,
          cutLengthCross: job.cutLengthCross,
          jobDate: job.jobDate,
          price: job.price,
          memo: job.memo,
        }}
      />
    </Layout>,
  )
})

// ----- 작업 수정 처리 (POST) -----
adminRoutes.post('/edit/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  try {
    const db = getDb(c.env.DB)
    const racketId = numOrNull(body.racket_id)
    if (!racketId) throw new ValidationError('라켓을 선택하세요.')
    const r = await db.select({ id: rackets.id }).from(rackets).where(eq(rackets.id, racketId)).all()
    if (r.length === 0) throw new ValidationError('선택한 라켓을 찾을 수 없습니다.')

    const stringType = requireString(body.string_type, '스트링 종류')
    const jobDate = toDateOrThrow(body.job_date, '작업일')

    const update = {
      racketId,
      stringType,
      stringId: numOrNull(body.string_id),
      tensionMain: toNumberOrNull(body.tension_main),
      tensionCross: toNumberOrNull(body.tension_cross),
      cutLengthMain: toNumberOrNull(body.cut_length_main),
      cutLengthCross: toNumberOrNull(body.cut_length_cross),
      jobDate,
      price: toNumberOrNull(body.price),
      memo: body.memo ? String(body.memo).trim() || null : null,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    const res = await db.update(stringJobs).set(update).where(eq(stringJobs.id, id)).returning().all()
    if (res.length === 0) return c.notFound()
    return toastRedirect('/rhksflwk', '작업이 수정되었습니다.')
  } catch (e: any) {
    if (e instanceof ValidationError) {
      return c.html(
        <Layout title="작업 수정" isAdmin={true} appName={c.env.APP_NAME}>
          <div class="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 mb-4 text-sm">{escapeHtml(e.message)}</div>
          <a href={`/rhksflwk/edit/${id}`} class="text-blue-600 hover:underline text-sm">← 다시 작성</a>
        </Layout>,
        400,
      )
    }
    return c.text('수정 실패: 서버 오류가 발생했습니다.', 500)
  }
})

// ----- 작업 빠른등록 (POST): 기존 작업을 오늘 날짜로 즉시 복제 -----
adminRoutes.post('/jobs/:id/duplicate', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const rows = await db
    .select({
      racketId: stringJobs.racketId, stringType: stringJobs.stringType, stringId: stringJobs.stringId,
      tensionMain: stringJobs.tensionMain, tensionCross: stringJobs.tensionCross,
      cutLengthMain: stringJobs.cutLengthMain, cutLengthCross: stringJobs.cutLengthCross,
      price: stringJobs.price, memo: stringJobs.memo,
    })
    .from(stringJobs)
    .where(eq(stringJobs.id, id))
    .limit(1)
    .all()
  if (rows.length === 0) return c.notFound()
  const src = rows[0]
  const today = new Date().toISOString().slice(0, 10)
  await db.insert(stringJobs).values({
    racketId: src.racketId,
    stringType: src.stringType,
    stringId: src.stringId,
    tensionMain: src.tensionMain,
    tensionCross: src.tensionCross,
    cutLengthMain: src.cutLengthMain,
    cutLengthCross: src.cutLengthCross,
    jobDate: today,
    price: src.price,
    memo: src.memo,
  }).run()
  return toastRedirect('/rhksflwk', `빠른등록 완료 (${today}) — 고객/라켓/스트링은 그대로 복사되었습니다.`)
})

// ----- 작업 삭제 (form 기반) -----
adminRoutes.post('/jobs/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  await db.delete(stringJobs).where(eq(stringJobs.id, id)).run()
  return toastRedirect('/rhksflwk', '작업이 삭제되었습니다.')
})