import { Hono } from 'hono'
import type { AppEnv } from '../middleware/auth'
import { requireAdmin } from '../middleware/auth'
import { Layout } from '../views/layout'
import { StringForm } from '../views/StringForm'
import { getDb } from '../db/client'
import { strings as stringsTbl } from '../db/schema'
import { and, asc, desc, eq, like, or } from 'drizzle-orm'
import { escapeHtml, escapeLike, ValidationError, requireString, numOrNull, toNumberOrNull } from '../lib/validation'
import {
  STRING_CATEGORIES,
  STRING_SHAPES,
  STRING_COLORS,
} from '../lib/stringLabels'

// Toast 리다이렉트 헬퍼
function toastRedirect(path: string, msg: string, type: 'success' | 'error' = 'success') {
  const params = new URLSearchParams({ toast: type, msg })
  return new Response(null, { status: 302, headers: { Location: `${path}?${params.toString()}` } })
}

export const stringsRoutes = new Hono<AppEnv>()

// 관리자 라우트 전체 보호
stringsRoutes.use('/*', requireAdmin)

// ----- 목록 -----
stringsRoutes.get('/', async (c) => {
  const url = new URL(c.req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const category = (url.searchParams.get('category') ?? '').trim() || null

  type SortKey = 'brand' | 'name' | 'category' | 'gauge' | 'color' | 'shape' | 'stiffnessRa' | 'tensionLossPct' | 'spinPotential' | 'cost'
  const SORTABLE: SortKey[] = ['brand', 'name', 'category', 'gauge', 'color', 'shape', 'stiffnessRa', 'tensionLossPct', 'spinPotential', 'cost']
  const sort = (url.searchParams.get('sort') ?? '') as SortKey
  const sortOrder = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc'
  const isValidSort = (s: string): s is SortKey => SORTABLE.includes(s as SortKey)
  const activeSort: SortKey = isValidSort(sort) ? sort : 'name'
  const activeOrder = sortOrder

  const db = getDb(c.env.DB)
  const conds: any[] = []
    if (q) {
    const like_ = `%${escapeLike(q)}%`
    conds.push(or(like(stringsTbl.brand, like_), like(stringsTbl.name, like_)))
  }
  if (category) conds.push(eq(stringsTbl.category, category))
  const where = conds.length > 0 ? and(...conds) : undefined

  const getSortExpr = (key: SortKey, order: 'asc' | 'desc') => {
    const dir = order === 'asc' ? asc : desc
    switch (key) {
      case 'brand': return [dir(stringsTbl.brand), asc(stringsTbl.name)]
      case 'category': return [dir(stringsTbl.category), asc(stringsTbl.name)]
      case 'gauge': return [dir(stringsTbl.gauge), asc(stringsTbl.name)]
      case 'color': return [dir(stringsTbl.color), asc(stringsTbl.name)]
      case 'shape': return [dir(stringsTbl.shape), asc(stringsTbl.name)]
      case 'stiffnessRa': return [dir(stringsTbl.stiffnessRa), asc(stringsTbl.name)]
      case 'tensionLossPct': return [dir(stringsTbl.tensionLossPct), asc(stringsTbl.name)]
      case 'spinPotential': return [dir(stringsTbl.spinPotential), asc(stringsTbl.name)]
      case 'cost': return [dir(stringsTbl.cost), asc(stringsTbl.name)]
      case 'name':
      default: return [dir(stringsTbl.name), asc(stringsTbl.brand)]
    }
  }

  const buildQs = (overrides: Record<string, string | number | null>) => {
    const params = new URLSearchParams()
    const base: Record<string, string> = {}
    if (q) base['q'] = q
    if (category) base['category'] = category
    if (activeSort !== 'name') base['sort'] = activeSort
    if (activeOrder !== 'asc') base['order'] = activeOrder
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v)
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === '') params.delete(k)
      else params.set(k, String(v))
    }
    const s = params.toString()
    return s ? `?${s}` : ''
  }

  // 정렬 가능한 컬럼 헤더 생성
  const sortableHeader = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => {
    const isActive = activeSort === key
    const nextOrder = isActive && activeOrder === 'asc' ? 'desc' : 'asc'
    const arrow = isActive ? (activeOrder === 'asc' ? ' ▲' : ' ▼') : ''
    return (
      <th class={`text-${align} px-3 py-2 hover:bg-slate-200 select-none`}>
        <a href={`/rhksflwk/strings${buildQs({ sort: key, order: nextOrder })}`} class="block cursor-pointer">
          {label}{arrow}
        </a>
      </th>
    )
  }

  const rows = await db
    .select()
    .from(stringsTbl)
    .where(where as any)
    .orderBy(...getSortExpr(activeSort, activeOrder))
    .all()

  return c.html(
    <Layout title="스트링 관리" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">스트링 관리</h1>
        <div class="flex gap-2 text-sm">
          <a href="/rhksflwk" class="text-slate-600 hover:text-blue-600">← 대시보드</a>
          <a href="/rhksflwk/strings/new" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">+ 새 스트링</a>
        </div>
      </div>

      <section class="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <form method="get" action="/rhksflwk/strings" class="grid gap-3 md:grid-cols-4">
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
            <a href="/rhksflwk/strings" class="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">초기화</a>
          </div>
        </form>
      </section>

      {rows.length === 0 ? (
        <div class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          등록된 스트링이 없습니다. 우측 상단 "+ 새 스트링"을 눌러 시작하세요.
        </div>
      ) : (
                <div class="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table class="min-w-full text-sm">
                        <thead class="bg-slate-100 text-slate-700">
              <tr>
                <th class="text-left px-3 py-2">ID</th>
                {sortableHeader('brand', '브랜드')}
                {sortableHeader('name', '이름')}
                {sortableHeader('category', '카테고리')}
                {sortableHeader('gauge', '두께 (mm)')}
                {sortableHeader('color', '색상')}
                {sortableHeader('shape', '형태')}
                {sortableHeader('stiffnessRa', '강성', 'right')}
                {sortableHeader('tensionLossPct', '텐션 로스 (%)', 'right')}
                {sortableHeader('spinPotential', '스핀', 'right')}
                {sortableHeader('cost', '비용', 'right')}
                <th class="text-right px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                                <tr class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td class="px-3 py-2">{r.id}</td>
                  <td class="px-3 py-2">{escapeHtml(r.brand)}</td>
                  <td class="px-3 py-2">{escapeHtml(r.name)}</td>
                  <td class="px-3 py-2">{(STRING_CATEGORIES as Record<string, string>)[r.category] ?? r.category}</td>
                  <td class="px-3 py-2">{r.gauge ? escapeHtml(r.gauge) : '-'}</td>
                  <td class="px-3 py-2">{(STRING_COLORS as Record<string, string>)[r.color ?? ''] ?? r.color ?? '-'}</td>
                  <td class="px-3 py-2">{(STRING_SHAPES as Record<string, string>)[r.shape ?? ''] ?? r.shape ?? '-'}</td>
                  <td class="px-3 py-2 text-right">{r.stiffnessRa != null ? r.stiffnessRa : '-'}</td>
                  <td class="px-3 py-2 text-right">{r.tensionLossPct != null ? r.tensionLossPct : '-'}</td>
                  <td class="px-3 py-2 text-right">{r.spinPotential != null ? r.spinPotential : '-'}</td>
                  <td class="px-3 py-2 text-right">{r.cost != null ? `₩${r.cost.toLocaleString('ko-KR')}` : '-'}</td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <a href={`/rhksflwk/strings/${r.id}/edit`} class="text-blue-600 hover:underline">수정</a>
                    <form method="post" action={`/rhksflwk/strings/${r.id}/delete`} class="inline" onsubmit="return confirm('이 스트링을 삭제하시겠습니까?')">
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

// ----- 등록 폼 -----
stringsRoutes.get('/new', async (c) => {
  return c.html(
    <Layout title="스트링 등록" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">새 스트링 등록</h1>
        <a href="/rhksflwk/strings" class="text-sm text-slate-600 hover:text-blue-600">← 목록</a>
      </div>
      <StringForm isEdit={false} categories={STRING_CATEGORIES} shapes={STRING_SHAPES} colors={STRING_COLORS} />
    </Layout>,
  )
})

// ----- 등록 처리 -----
stringsRoutes.post('/', async (c) => {
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  try {
    const insert = parseStringBody(body)
    const db = getDb(c.env.DB)
    await db.insert(stringsTbl).values(insert).run()
    const brand = typeof body.brand === 'string' ? body.brand : ''
    const name = typeof body.name === 'string' ? body.name : ''
    return toastRedirect('/rhksflwk/strings', `스트링 "${brand} ${name}"이 등록되었습니다.`)
  } catch (e: any) {
    if (e instanceof ValidationError) {
      return c.html(
        <Layout title="스트링 등록" isAdmin={true} appName={c.env.APP_NAME}>
          <div class="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 mb-4 text-sm">{escapeHtml(e.message)}</div>
          <a href="/rhksflwk/strings/new" class="text-blue-600 hover:underline text-sm">← 다시 작성</a>
        </Layout>,
        400,
      )
    }
    return c.text('등록 실패: 서버 오류가 발생했습니다.', 500)
  }
})

// ----- 수정 폼 -----
stringsRoutes.get('/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const rows = await db.select().from(stringsTbl).where(eq(stringsTbl.id, id)).all()
  if (rows.length === 0) return c.notFound()
  return c.html(
    <Layout title="스트링 수정" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">스트링 수정 #{rows[0].id}</h1>
        <a href="/rhksflwk/strings" class="text-sm text-slate-600 hover:text-blue-600">← 목록</a>
      </div>
      <StringForm
        isEdit={true}
        editId={rows[0].id}
        categories={STRING_CATEGORIES}
        shapes={STRING_SHAPES}
        colors={STRING_COLORS}
        values={rows[0]}
      />
    </Layout>,
  )
})

// ----- 수정 처리 -----
stringsRoutes.post('/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  try {
    const update = parseStringBody(body)
    const db = getDb(c.env.DB)
    const res = await db.update(stringsTbl).set(update).where(eq(stringsTbl.id, id)).returning({ id: stringsTbl.id }).all()
    if (res.length === 0) return c.notFound()
    return toastRedirect('/rhksflwk/strings', '스트링이 수정되었습니다.')
  } catch (e: any) {
    if (e instanceof ValidationError) {
      return c.html(
        <Layout title="스트링 수정" isAdmin={true} appName={c.env.APP_NAME}>
          <div class="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 mb-4 text-sm">{escapeHtml(e.message)}</div>
          <a href={`/rhksflwk/strings/${id}/edit`} class="text-blue-600 hover:underline text-sm">← 다시 작성</a>
        </Layout>,
        400,
      )
    }
    return c.text('수정 실패: 서버 오류가 발생했습니다.', 500)
  }
})

// ----- 삭제 -----
stringsRoutes.post('/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  await db.delete(stringsTbl).where(eq(stringsTbl.id, id)).run()
  return toastRedirect('/rhksflwk/strings', '스트링이 삭제되었습니다.')
})

// ----- helpers -----
function parseStringBody(body: Record<string, any>) {
  const brand = requireString(body.brand, '브랜드')
  const name = requireString(body.name, '이름')
  const category = requireString(body.category, '카테고리')
  return {
    brand,
    name,
    category,
    shape: body.shape ? String(body.shape) : null,
    gauge: body.gauge ? String(body.gauge).trim() || null : null,
    color: body.color ? String(body.color) : null,
    stiffnessRa: toNumberOrNull(body.stiffness_ra),
    tensionLossPct: toNumberOrNull(body.tension_loss_pct),
    spinPotential: numOrNull(body.spin_potential),
    cost: toNumberOrNull(body.cost),
    memo: body.memo ? String(body.memo).trim() || null : null,
  }
}