import { Hono } from 'hono'
import type { AppEnv } from '../middleware/auth'
import { requireAdmin } from '../middleware/auth'
import { getDb } from '../db/client'
import { customers, rackets, stringJobs, strings } from '../db/schema'
import { and, desc, eq, gte, like, lte, or } from 'drizzle-orm'
import {
  jsonError,
  numOrNull,
  requireString,
  toDateOrThrow,
  toNumberOrNull,
  ValidationError,
  escapeLike,
} from '../lib/validation'

export const api = new Hono<AppEnv>()

function numFromQuery(v: string | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function fetchJobsList(
  d1: D1Database,
  q: {
    text?: string | null
    stringType?: string | null
    dateFrom?: string | null
    dateTo?: string | null
    tensionMin?: number | null
    tensionMax?: number | null
    limit?: number
    offset?: number
  },
) {
  const db = getDb(d1)
  const conds: any[] = []
    if (q.text) {
    const like_ = `%${escapeLike(q.text)}%`
    conds.push(or(
      like(customers.name, like_),
      like(rackets.racketModel, like_),
      like(stringJobs.stringType, like_),
      like(stringJobs.memo, like_),
    ))
  }
  if (q.stringType) conds.push(like(stringJobs.stringType, `%${escapeLike(q.stringType)}%`))
  if (q.dateFrom) conds.push(gte(stringJobs.jobDate, q.dateFrom))
  if (q.dateTo) conds.push(lte(stringJobs.jobDate, q.dateTo))
  if (q.tensionMin != null) {
    conds.push(or(
      gte(stringJobs.tensionMain, q.tensionMin),
      gte(stringJobs.tensionCross, q.tensionMin),
    ))
  }
  if (q.tensionMax != null) {
    conds.push(or(
      lte(stringJobs.tensionMain, q.tensionMax),
      lte(stringJobs.tensionCross, q.tensionMax),
    ))
  }
  const where = conds.length > 0 ? and(...conds) : undefined

  const limit = Math.min(q.limit ?? 100, 500)
  const offset = q.offset ?? 0

  const rows = await db
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
      createdAt: stringJobs.createdAt,
      updatedAt: stringJobs.updatedAt,
      racketId: stringJobs.racketId,
      racketModel: rackets.racketModel,
      racketNickname: rackets.nickname,
      racketHeadSize: rackets.headSize,
      racketStringPattern: rackets.stringPattern,
      customerId: customers.id,
      customerName: customers.name,
      // 마스터 스트링 (없을 수 있음 - LEFT JOIN)
      masterBrand: strings.brand,
      masterName: strings.name,
      masterCategory: strings.category,
      masterGauge: strings.gauge,
      masterColor: strings.color,
    })
    .from(stringJobs)
    .innerJoin(rackets, eq(rackets.id, stringJobs.racketId))
    .innerJoin(customers, eq(customers.id, rackets.customerId))
    .leftJoin(strings, eq(strings.id, stringJobs.stringId))
    .where(where as any)
    .orderBy(desc(stringJobs.jobDate), desc(stringJobs.id))
    .limit(limit)
    .offset(offset)
    .all()
  return rows
}

// ---------- jobs ----------

api.get('/jobs', requireAdmin, async (c) => {
  try {
    const url = new URL(c.req.url)
    const text = url.searchParams.get('q')
    const stringType = url.searchParams.get('string_type')
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const tensionMin = numFromQuery(url.searchParams.get('tension_min') ?? undefined)
    const tensionMax = numFromQuery(url.searchParams.get('tension_max') ?? undefined)
    const limit = numFromQuery(url.searchParams.get('limit') ?? undefined) ?? 100
    const offset = numFromQuery(url.searchParams.get('offset') ?? undefined) ?? 0

    const rows = await fetchJobsList(c.env.DB, {
      text,
      stringType,
      dateFrom,
      dateTo,
      tensionMin,
      tensionMax,
      limit,
      offset,
    })
    return c.json({ items: rows, count: rows.length })
  } catch (e: any) {
        return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

api.get('/jobs/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError('잘못된 id')
  const db = getDb(c.env.DB)
  const rows = await db
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
      createdAt: stringJobs.createdAt,
      updatedAt: stringJobs.updatedAt,
      racketId: stringJobs.racketId,
      racketModel: rackets.racketModel,
      racketNickname: rackets.nickname,
      racketHeadSize: rackets.headSize,
      racketStringPattern: rackets.stringPattern,
      customerId: customers.id,
      customerName: customers.name,
      masterBrand: strings.brand,
      masterName: strings.name,
      masterCategory: strings.category,
      masterGauge: strings.gauge,
      masterColor: strings.color,
    })
    .from(stringJobs)
    .innerJoin(rackets, eq(rackets.id, stringJobs.racketId))
    .innerJoin(customers, eq(customers.id, rackets.customerId))
    .leftJoin(strings, eq(strings.id, stringJobs.stringId))
    .where(eq(stringJobs.id, id))
    .all()
  if (rows.length === 0) return jsonError('작업을 찾을 수 없습니다.', 404)
  return c.json(rows[0])
})

api.post('/jobs', requireAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const db = getDb(c.env.DB)
    const racketId = Number(body.racket_id)
    if (!Number.isFinite(racketId)) throw new ValidationError('racket_id가 필요합니다.')
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
      memo: body.memo == null ? null : String(body.memo).trim() || null,
    }
    const result = await db.insert(stringJobs).values(insert).returning().all()
    return c.json(result[0], 201)
  } catch (e: any) {
        if (e instanceof ValidationError) return jsonError(e.message, 400)
    return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

api.put('/jobs/:id', requireAdmin, async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return jsonError('잘못된 id')
    const body = await c.req.json().catch(() => ({}))
    const db = getDb(c.env.DB)

    const stringType = requireString(body.string_type, '스트링 종류')
    const jobDate = toDateOrThrow(body.job_date, '작업일')

    const update = {
      stringType,
      stringId: numOrNull(body.string_id),
      tensionMain: toNumberOrNull(body.tension_main),
      tensionCross: toNumberOrNull(body.tension_cross),
      cutLengthMain: toNumberOrNull(body.cut_length_main),
      cutLengthCross: toNumberOrNull(body.cut_length_cross),
      jobDate,
      price: toNumberOrNull(body.price),
      memo: body.memo == null ? null : String(body.memo).trim() || null,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    const result = await db.update(stringJobs).set(update).where(eq(stringJobs.id, id)).returning().all()
    if (result.length === 0) return jsonError('작업을 찾을 수 없습니다.', 404)
    return c.json(result[0])
  } catch (e: any) {
        if (e instanceof ValidationError) return jsonError(e.message, 400)
    return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

api.delete('/jobs/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError('잘못된 id')
  const db = getDb(c.env.DB)
  const result = await db.delete(stringJobs).where(eq(stringJobs.id, id)).returning({ id: stringJobs.id }).all()
  if (result.length === 0) return jsonError('작업을 찾을 수 없습니다.', 404)
  return c.json({ ok: true, id })
})

// ---------- customers (관리자 전용) ----------

api.get('/customers', requireAdmin, async (c) => {
  const url = new URL(c.req.url)
  const q = url.searchParams.get('q')?.trim()
  const db = getDb(c.env.DB)
    const where = q ? like(customers.name, `%${escapeLike(q)}%`) : undefined
  const rows = await db
    .select()
    .from(customers)
    .where(where as any)
    .orderBy(customers.name)
    .limit(50)
    .all()
  return c.json({ items: rows })
})

api.post('/customers', requireAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const name = requireString(body.name, '고객명')
    const db = getDb(c.env.DB)
    const result = await db.insert(customers).values({ name }).returning().all()
    return c.json(result[0], 201)
  } catch (e: any) {
        if (e instanceof ValidationError) return jsonError(e.message, 400)
    return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

api.get('/customers/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError('잘못된 id')
  const db = getDb(c.env.DB)
  const row = await db.select().from(customers).where(eq(customers.id, id)).all()
  if (row.length === 0) return jsonError('고객을 찾을 수 없습니다.', 404)
  return c.json(row[0])
})

api.get('/customers/:id/rackets', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError('잘못된 id')
  const db = getDb(c.env.DB)
  const rows = await db.select().from(rackets).where(eq(rackets.customerId, id)).orderBy(rackets.id).all()
  return c.json({ items: rows })
})

api.post('/customers/:id/rackets', requireAdmin, async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return jsonError('잘못된 id')
    const body = await c.req.json().catch(() => ({}))
    const racketModel = requireString(body.racket_model, '라켓 모델')
    const nickname = body.nickname == null ? null : String(body.nickname).trim() || null
    const headSize = toNumberOrNull(body.head_size)
    const stringPattern = body.string_pattern == null
      ? null
      : String(body.string_pattern).trim() || null
    const db = getDb(c.env.DB)

    const cust = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, id)).all()
    if (cust.length === 0) return jsonError('고객을 찾을 수 없습니다.', 404)

    const result = await db.insert(rackets).values({
      customerId: id,
      racketModel,
      nickname,
      headSize,
      stringPattern,
    }).returning().all()
    return c.json(result[0], 201)
  } catch (e: any) {
        if (e instanceof ValidationError) return jsonError(e.message, 400)
    return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

// ---------- strings (스트링 마스터) ----------

// 관리자 전용: 목록 (공개 자동완성은 프론트엔드에서 처리 또는 별도 엔드포인트)
api.get('/strings', requireAdmin, async (c) => {
  try {
    const url = new URL(c.req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const category = (url.searchParams.get('category') ?? '').trim() || null
    const limit = Math.min(numFromQuery(url.searchParams.get('limit') ?? undefined) ?? 100, 500)
    const offset = numFromQuery(url.searchParams.get('offset') ?? undefined) ?? 0

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

    const rows = await db
      .select()
      .from(strings)
      .where(where as any)
      .orderBy(strings.brand, strings.name)
      .limit(limit)
      .offset(offset)
      .all()
    return c.json({ items: rows, count: rows.length })
  } catch (e: any) {
        return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

api.get('/strings/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError('잘못된 id')
  const db = getDb(c.env.DB)
  const rows = await db.select().from(strings).where(eq(strings.id, id)).all()
  if (rows.length === 0) return jsonError('스트링을 찾을 수 없습니다.', 404)
  return c.json(rows[0])
})

// 관리자: 등록
api.post('/strings', requireAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const brand = requireString(body.brand, '브랜드')
    const name = requireString(body.name, '이름')
    const category = requireString(body.category, '카테고리')

    const insert = {
      brand,
      name,
      category,
      shape: body.shape ?? null,
      gauge: body.gauge ? String(body.gauge).trim() || null : null,
      color: body.color ?? null,
      stiffnessRa: toNumberOrNull(body.stiffness_ra),
      tensionLossPct: toNumberOrNull(body.tension_loss_pct),
      spinPotential: numOrNull(body.spin_potential),
      cost: toNumberOrNull(body.cost),
      memo: body.memo ? String(body.memo).trim() || null : null,
    }
    const db = getDb(c.env.DB)
    const result = await db.insert(strings).values(insert).returning().all()
    return c.json(result[0], 201)
  } catch (e: any) {
        if (e instanceof ValidationError) return jsonError(e.message, 400)
    return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

// 관리자: 수정
api.put('/strings/:id', requireAdmin, async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return jsonError('잘못된 id')
    const body = await c.req.json().catch(() => ({}))
    const brand = requireString(body.brand, '브랜드')
    const name = requireString(body.name, '이름')
    const category = requireString(body.category, '카테고리')

    const update = {
      brand,
      name,
      category,
      shape: body.shape ?? null,
      gauge: body.gauge ? String(body.gauge).trim() || null : null,
      color: body.color ?? null,
      stiffnessRa: toNumberOrNull(body.stiffness_ra),
      tensionLossPct: toNumberOrNull(body.tension_loss_pct),
      spinPotential: numOrNull(body.spin_potential),
      cost: toNumberOrNull(body.cost),
      memo: body.memo ? String(body.memo).trim() || null : null,
    }
    const db = getDb(c.env.DB)
    const result = await db.update(strings).set(update).where(eq(strings.id, id)).returning().all()
    if (result.length === 0) return jsonError('스트링을 찾을 수 없습니다.', 404)
    return c.json(result[0])
  } catch (e: any) {
        if (e instanceof ValidationError) return jsonError(e.message, 400)
    return jsonError('서버 오류가 발생했습니다. 관리자에게 문의하세요.', 500)
  }
})

// 관리자: 삭제
api.delete('/strings/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError('잘못된 id')
  const db = getDb(c.env.DB)
  // string_jobs의 string_id는 ON DELETE SET NULL로 자동 해제됨 (string_type은 유지)
  const result = await db.delete(strings).where(eq(strings.id, id)).returning({ id: strings.id }).all()
  if (result.length === 0) return jsonError('스트링을 찾을 수 없습니다.', 404)
  return c.json({ ok: true, id })
})

// 관리자: 신규 고객 인라인 등록 (작업 등록 폼에서 호출)
api.post('/customers/inline', requireAdmin, async (c) => {
  const body = await c.req.parseBody().catch(() => ({})) as Record<string, any>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return jsonError('고객명을 입력하세요.', 400)
  const db = getDb(c.env.DB)
  const existing = await db.select({ id: customers.id }).from(customers).where(eq(customers.name, name)).all()
  if (existing.length > 0) return c.json({ id: existing[0].id, name, alreadyExists: true })
  const ins = await db.insert(customers).values({ name }).returning({ id: customers.id, name: customers.name }).all()
  return c.json({ id: ins[0].id, name: ins[0].name, alreadyExists: false })
})