import { Hono } from 'hono'
import type { AppEnv } from '../middleware/auth'
import { Layout } from '../views/layout'
import { StringCard } from '../views/StringCard'
import { getDb } from '../db/client'
import { customers, rackets, stringJobs, strings } from '../db/schema'
import { and, asc, count, desc, eq, gte, like, lte, or } from 'drizzle-orm'
import { escapeHtml } from '../lib/validation'
import { STRING_CATEGORIES, formatManwon, categoryLabel } from '../lib/stringLabels'
import { siteAuthMiddleware } from '../middleware/auth'

export const publicRoutes = new Hono<AppEnv>()

// 전체 비밀번호 인증이 필요한 페이지
publicRoutes.use('*', siteAuthMiddleware)

// LIKE 검색용 와일드카드 이스케이프 ('%'와 '_' 리터럴화)
function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`)
}

function fmtTension(main: number | null, cross: number | null) {
  if (main == null && cross == null) return '-'
  if (main != null && cross != null && main !== cross) return `${main} / ${cross}`
  return `${main ?? cross}`
}
function fmtPrice(p: number | null) {
  return formatManwon(p)
}
function fmtLenPair(main: number | null, cross: number | null) {
  if (main == null && cross == null) return '-'
  if (main != null && cross != null && main !== cross) return `${main} / ${cross}`
  return `${main ?? cross}`
}
function fmtLen(l: number | null) {
  if (l == null) return '-'
  return `${l}`
}
function fmtHeadSize(s: number | null) {
  return s == null ? '-' : `${s} sq.in`
}

// 고객명 마스킹 (가운데 글자 O로 처리)
function maskCustomerName(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + 'O'
  // 3글자 이상: 첫 글자 + O + 마지막 글자
  return name[0] + 'O'.repeat(name.length - 2) + name[name.length - 1]
}
function numFromQuery(v: string | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

publicRoutes.get('/', async (c) => {
  const url = new URL(c.req.url)
  const text = url.searchParams.get('q') ?? ''
  const stringType = url.searchParams.get('string_type') ?? ''
  const dateFrom = url.searchParams.get('date_from') ?? ''
  const dateTo = url.searchParams.get('date_to') ?? ''
  const tensionMin = numFromQuery(url.searchParams.get('tension_min') ?? undefined)
  const tensionMax = numFromQuery(url.searchParams.get('tension_max') ?? undefined)
  const page = Math.max(1, numFromQuery(url.searchParams.get('page') ?? undefined) ?? 1)
    const pageSize = 20

  // 정렬 (sortable columns)
  type SortKey = 'jobDate' | 'customer' | 'racket' | 'stringType' | 'tensionMain' | 'price'
  const SORTABLE: SortKey[] = ['jobDate', 'customer', 'racket', 'stringType', 'tensionMain', 'price']
  const sort = (url.searchParams.get('sort') ?? '') as SortKey
  const sortOrder = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc'
  const isValidSort = (s: string): s is SortKey => SORTABLE.includes(s as SortKey)
  const activeSort = isValidSort(sort) ? sort : 'jobDate'
  const activeOrder = sortOrder

  const db = getDb(c.env.DB)
  const conds: any[] = []
    if (text) {
    const like_ = `%${escapeLike(text)}%`
    conds.push(or(
      like(customers.name, like_),
      like(rackets.racketModel, like_),
      like(stringJobs.stringType, like_),
      like(stringJobs.memo, like_),
    ))
  }
  if (stringType) conds.push(like(stringJobs.stringType, `%${escapeLike(stringType)}%`))
  if (dateFrom) conds.push(gte(stringJobs.jobDate, dateFrom))
  if (dateTo) conds.push(lte(stringJobs.jobDate, dateTo))
  if (tensionMin != null) {
    conds.push(or(
      gte(stringJobs.tensionMain, tensionMin),
      gte(stringJobs.tensionCross, tensionMin),
    ))
  }
  if (tensionMax != null) {
    conds.push(or(
      lte(stringJobs.tensionMain, tensionMax),
      lte(stringJobs.tensionCross, tensionMax),
    ))
  }
  const where = conds.length > 0 ? and(...conds) : undefined

  const totalRows = await db
    .select({ n: count() })
    .from(stringJobs)
    .innerJoin(rackets, eq(rackets.id, stringJobs.racketId))
    .innerJoin(customers, eq(customers.id, rackets.customerId))
    .where(where as any)
    .all()
  const total = totalRows[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const offset = (safePage - 1) * pageSize

  const getSortExpr = (key: SortKey, order: 'asc' | 'desc') => {
    const dir = order === 'asc' ? asc : desc
    switch (key) {
      case 'customer': return [dir(customers.name), dir(stringJobs.id)]
      case 'racket': return [dir(rackets.racketModel), dir(stringJobs.id)]
      case 'stringType': return [dir(stringJobs.stringType), dir(stringJobs.id)]
      case 'tensionMain': return [dir(stringJobs.tensionMain), dir(stringJobs.id)]
      case 'price': return [dir(stringJobs.price), dir(stringJobs.id)]
      case 'jobDate':
      default: return [dir(stringJobs.jobDate), dir(stringJobs.id)]
    }
  }

  const rows = await db
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
      // 마스터 스트링 가격 정보 (표시 시점 계산용)
      masterCost: strings.cost,
      masterCategory: strings.category,
    })
    .from(stringJobs)
    .innerJoin(rackets, eq(rackets.id, stringJobs.racketId))
    .innerJoin(customers, eq(customers.id, rackets.customerId))
    .leftJoin(strings, eq(strings.id, stringJobs.stringId))
    .where(where as any)
    .orderBy(...getSortExpr(activeSort, activeOrder))
    .limit(pageSize + 1)
    .offset(offset)
    .all()

  const hasNext = rows.length > pageSize
  const items = rows.slice(0, pageSize)
  const isAdmin = c.get('isAdmin')

  const buildQs = (overrides: Record<string, string | number | null>) => {
    const params = new URLSearchParams()
    const base: Record<string, string> = {
      q: text, string_type: stringType, date_from: dateFrom, date_to: dateTo,
    }
    if (tensionMin != null) base['tension_min'] = String(tensionMin)
    if (tensionMax != null) base['tension_max'] = String(tensionMax)
    // 정렬 파라미터 유지
    if (sort) base['sort'] = sort
    if (sortOrder !== 'desc') base['order'] = sortOrder
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v)
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    }
    const s = params.toString()
    return s ? `?${s}` : ''
  }

  // 정렬 가능한 컬럼 헤더 생성
  const sortableHeader = (key: string, label: string, hideOnMobile = false) => {
    const isActive = activeSort === key
    const nextOrder = isActive && activeOrder === 'desc' ? 'asc' : 'desc'
    const arrow = isActive ? (activeOrder === 'desc' ? ' ▼' : ' ▲') : ''
    return (
      <th class={`${hideOnMobile ? 'hidden md:table-cell ' : ''}text-left px-3 py-2 hover:bg-slate-200 select-none`}>
        <a href={`/${buildQs({ sort: key, order: nextOrder })}`} class="block cursor-pointer">
          {label}{arrow}
        </a>
      </th>
    )
  }

  const pageItems = (cur: number, totalP: number): (number | 'ellipsis')[] => {
    const set = new Set<number>()
    ;[1, totalP, cur - 2, cur - 1, cur, cur + 1, cur + 2].forEach((p) => {
      if (p >= 1 && p <= totalP) set.add(p)
    })
    const sorted = [...set].sort((a, b) => a - b)
    const out: (number | 'ellipsis')[] = []
    let prev = 0
    for (const p of sorted) {
      if (p - prev > 1) out.push('ellipsis')
      out.push(p)
      prev = p
    }
    return out
  }

  return c.html(
    <Layout title="작업 이력" isAdmin={isAdmin} appName={c.env.APP_NAME}>
      <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-900">
        💡 <strong>공임비 안내</strong>: 기본 1만원 / 작업 1회.
      </div>

      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <form method="get" action="/" class="grid gap-3 md:grid-cols-6">
          <label class="md:col-span-2 flex flex-col text-sm">
            <span class="text-slate-600 mb-1">검색 (고객명 / 라켓 / 스트링 / 메모)</span>
            <input name="q" value={escapeHtml(text)} placeholder="예: 폴리, Wilson, RPM" class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">작업일 (부터)</span>
            <input type="date" name="date_from" value={escapeHtml(dateFrom)} class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">작업일 (까지)</span>
            <input type="date" name="date_to" value={escapeHtml(dateTo)} class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="md:col-span-2 flex flex-col text-sm">
            <span class="text-slate-600 mb-1">텐션 범위 (lbs)</span>
            <div class="flex gap-2 items-center">
              <input type="number" step="0.5" name="tension_min" value={tensionMin ?? ''} placeholder="최소" class="w-full border border-slate-300 rounded px-3 py-2" />
              <span class="text-slate-400">~</span>
              <input type="number" step="0.5" name="tension_max" value={tensionMax ?? ''} placeholder="최대" class="w-full border border-slate-300 rounded px-3 py-2" />
            </div>
          </label>
          <div class="md:col-span-6 flex gap-2">
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">검색</button>
            <a href="/" class="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">초기화</a>
          </div>
        </form>
      </section>

      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">전체 작업 이력 <span class="text-sm text-slate-500 font-normal">({total}건 중 {offset + 1}–{offset + items.length} 표시)</span></h2>
          {isAdmin && (
            <a href="/rhksflwk/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm">+ 작업 등록</a>
          )}
        </div>
        {items.length === 0 ? (
          <div class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
            표시할 작업 이력이 없습니다.
          </div>
        ) : (
          <div class="overflow-x-auto bg-white border border-slate-200 rounded-lg">
            <table class="data-table min-w-full text-xs sm:text-sm">
              <thead class="bg-slate-100 text-slate-700">
                <tr>
                  {sortableHeader('jobDate', '작업일')}
                  {sortableHeader('customer', '고객')}
                  <th class="text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">라켓 (헤드 / 패턴)</th>
                  {sortableHeader('stringType', '스트링')}
                  {sortableHeader('tensionMain', '텐션 (lbs)')}
                  {sortableHeader('price', '비용', true)}
                  <th class="hidden md:table-cell text-left px-3 py-2 hover:bg-slate-200 cursor-pointer">메모</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td class="px-3 py-2 whitespace-nowrap">{r.jobDate}</td>
                    <td class="px-3 py-2 whitespace-nowrap">{escapeHtml(maskCustomerName(r.customerName))}</td>
                    <td class="px-3 py-2">
                      <div>{escapeHtml(r.racketModel)}</div>
                      {r.racketNickname && <div class="text-xs text-slate-500">({escapeHtml(r.racketNickname)})</div>}
                      <div class="text-xs text-slate-500">
                        {fmtHeadSize(r.racketHeadSize)} · {r.racketStringPattern ? escapeHtml(r.racketStringPattern) : '-'}
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      <div>{escapeHtml(r.stringType)}</div>
                      {r.masterCategory && <div class="mt-0.5 inline-block text-[11px] text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-px">{categoryLabel(r.masterCategory)}</div>}
                    </td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">{fmtTension(r.tensionMain, r.tensionCross)}</td>
                                        <td class="hidden md:table-cell px-3 py-2 text-right whitespace-nowrap">{fmtPrice(r.price ?? r.masterCost)}</td>
                    <td class="hidden md:table-cell px-3 py-2 max-w-xs">
                      {r.memo ? <span class="text-slate-600">{escapeHtml(r.memo)}</span> : <span class="text-slate-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav class="flex flex-wrap justify-center items-center gap-1.5 mt-4 text-sm">
          {safePage > 1 && (
            <a href={`/${buildQs({ page: 1 })}`} title="처음" class="px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50">«</a>
          )}
          {safePage > 1 && (
            <a href={`/${buildQs({ page: safePage - 1 })}`} class="px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50">‹</a>
          )}
          {pageItems(safePage, totalPages).map((p) =>
            p === 'ellipsis' ? (
              <span class="px-1 text-slate-400">…</span>
            ) : p === safePage ? (
              <span class="px-2.5 py-1.5 rounded bg-blue-600 text-white font-medium">{p}</span>
            ) : (
              <a href={`/${buildQs({ page: p })}`} class="px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50">{p}</a>
            ),
          )}
          {safePage < totalPages && (
            <a href={`/${buildQs({ page: safePage + 1 })}`} class="px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50">›</a>
          )}
          {safePage < totalPages && (
            <a href={`/${buildQs({ page: totalPages })}`} title="마지막" class="px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50">»</a>
          )}
        </nav>
      </section>
    </Layout>,
  )
})

// ----- 공개 스트링 마스터 목록 (/strings) -----
publicRoutes.get('/strings', async (c) => {
  const url = new URL(c.req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const category = (url.searchParams.get('category') ?? '').trim() || null

  type StringSortKey = 'name' | 'brand' | 'gaugeAsc' | 'gaugeDesc' | 'color' | 'shape' | 'costAsc' | 'costDesc'
  const sort = (url.searchParams.get('sort') ?? '') as StringSortKey
  const SORTABLE_STRINGS: StringSortKey[] = ['name', 'brand', 'gaugeAsc', 'gaugeDesc', 'color', 'shape', 'costAsc', 'costDesc']
  const rawSort = url.searchParams.get('sort') ?? ''
  const activeStringSort: StringSortKey = SORTABLE_STRINGS.includes(rawSort as StringSortKey)
    ? (rawSort as StringSortKey)
    : rawSort === 'gauge' ? 'gaugeAsc' : 'name'

  const db = getDb(c.env.DB)
  const conds: any[] = []
  if (q) {
        const like_ = `%${escapeLike(q)}%`
    conds.push(or(
      like(strings.brand, like_),
      like(strings.name, like_),
    ))
  }
  if (category) conds.push(eq(strings.category, category))
  const where = conds.length > 0 ? and(...conds) : undefined

  const getStringSortExpr = (key: StringSortKey) => {
    switch (key) {
      case 'brand': return [asc(strings.brand), asc(strings.name)]
      case 'gaugeAsc': return [asc(strings.gauge), asc(strings.name)]
      case 'gaugeDesc': return [desc(strings.gauge), asc(strings.name)]
      case 'color': return [asc(strings.color), asc(strings.name)]
      case 'shape': return [asc(strings.shape), asc(strings.name)]
      case 'costAsc': return [asc(strings.cost), asc(strings.name)]
      case 'costDesc': return [desc(strings.cost), asc(strings.name)]
      case 'name':
      default: return [asc(strings.name), asc(strings.brand)]
    }
  }

  const stringSortQs = (key: StringSortKey) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (key !== 'name') params.set('sort', key)
    const s = params.toString()
    return s ? `/strings?${s}` : '/strings'
  }

  const rows = await db
    .select()
    .from(strings)
    .where(where as any)
    .orderBy(...getStringSortExpr(activeStringSort))
    .all()
  const isAdmin = c.get('isAdmin')

  return c.html(
    <Layout title="보유 스트링" isAdmin={isAdmin} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">보유 스트링</h1>
        <div class="flex items-center gap-2 text-sm">
          <label class="flex items-center gap-1.5 text-slate-600">
            <span>정렬</span>
            <select
              onchange="window.location.href = this.value"
              class="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              <option value={stringSortQs('name')} {...(activeStringSort === 'name' ? { selected: true } : {})}>이름순</option>
              <option value={stringSortQs('brand')} {...(activeStringSort === 'brand' ? { selected: true } : {})}>브랜드순</option>
              <option value={stringSortQs('gaugeAsc')} {...(activeStringSort === 'gaugeAsc' ? { selected: true } : {})}>두께 얇은순</option>
              <option value={stringSortQs('gaugeDesc')} {...(activeStringSort === 'gaugeDesc' ? { selected: true } : {})}>두께 두꺼운순</option>
              <option value={stringSortQs('color')} {...(activeStringSort === 'color' ? { selected: true } : {})}>색상순</option>
              <option value={stringSortQs('shape')} {...(activeStringSort === 'shape' ? { selected: true } : {})}>형태순</option>
              <option value={stringSortQs('costAsc')} {...(activeStringSort === 'costAsc' ? { selected: true } : {})}>가격 낮은순</option>
              <option value={stringSortQs('costDesc')} {...(activeStringSort === 'costDesc' ? { selected: true } : {})}>가격 높은순</option>
            </select>
          </label>
          <a href="/" class="text-slate-600 hover:text-blue-600">← 작업 이력</a>
        </div>
      </div>

      <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-900">
        💡 <strong>공임비 안내</strong>: 기본 1만원 / 작업 1회. 매고 싶은 스트링을 골라주세요!
      </div>

      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <form method="get" action="/strings" class="grid gap-3 md:grid-cols-4">
          <label class="md:col-span-2 flex flex-col text-sm">
            <span class="text-slate-600 mb-1">검색 (브랜드 / 이름)</span>
            <input name="q" value={escapeHtml(q)} placeholder="예: Wilson, Poly" class="border border-slate-300 rounded px-3 py-2" />
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">카테고리</span>
            <select name="category" class="border border-slate-300 rounded px-3 py-2">
              <option value="">전체</option>
              {Object.entries(STRING_CATEGORIES).map(([k, v]) => (
                <option value={k} {...(category === k ? { selected: true } : {})}>{v}</option>
              ))}
            </select>
          </label>
          <div class="flex items-end gap-2">
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">검색</button>
            <a href="/strings" class="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">초기화</a>
          </div>
        </form>
      </section>

      {rows.length === 0 ? (
        <div class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          등록된 스트링이 없습니다.
        </div>
      ) : (
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => <StringCard s={s} />)}
        </div>
      )}
    </Layout>,
  )
})