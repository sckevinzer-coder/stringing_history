import { Hono } from 'hono'
import type { AppEnv } from '../middleware/auth'
import { requireAdmin } from '../middleware/auth'
import { Layout } from '../views/layout'
import { getDb } from '../db/client'
import { requests as requestsTbl } from '../db/schema'
import { desc, eq } from 'drizzle-orm'
import { escapeHtml } from '../lib/validation'

function toastRedirect(path: string, msg: string, type: 'success' | 'error' = 'success') {
  const params = new URLSearchParams({ toast: type, msg })
  return new Response(null, { status: 302, headers: { Location: `${path}?${params.toString()}` } })
}

const STATUS_LABEL: Record<string, string> = { new: '신규', done: '완료', dismissed: '반려' }
const TYPE_LABEL: Record<string, string> = { job: '작업 신청', purchase: '구매 요청' }

export const requestsRoutes = new Hono<AppEnv>()

requestsRoutes.use('/*', requireAdmin)

// ----- 신청 목록 -----
requestsRoutes.get('/', async (c) => {
  const url = new URL(c.req.url)
  const statusFilter = url.searchParams.get('status') ?? ''
  const db = getDb(c.env.DB)
  const rows = await db
    .select()
    .from(requestsTbl)
    .where((statusFilter === 'new' || statusFilter === 'done' || statusFilter === 'dismissed' ? eq(requestsTbl.status, statusFilter) : undefined) as any)
    .orderBy(desc(requestsTbl.id))
    .all()
  return c.html(
    <Layout title="신청 관리" isAdmin={true} appName={c.env.APP_NAME}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">신청 관리</h1>
        <a href="/rhksflwk" class="text-sm text-slate-600 hover:text-blue-600">← 대시보드</a>
      </div>
      <div class="flex gap-2 mb-4 text-sm">
        {['', 'new', 'done', 'dismissed'].map((s) => (
          <a
            href={s ? `/rhksflwk/requests?status=${s}` : '/rhksflwk/requests'}
            class={`px-3 py-1.5 rounded border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-50'}`}
          >
            {s ? STATUS_LABEL[s] : '전체'}
          </a>
        ))}
      </div>
      {rows.length === 0 ? (
        <div class="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          신청이 없습니다.
        </div>
      ) : (
        <div class="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table class="data-table min-w-full text-xs sm:text-sm">
            <thead class="bg-slate-100 text-slate-700">
              <tr>
                <th class="text-left px-3 py-2">ID</th>
                <th class="text-left px-3 py-2">유형</th>
                <th class="text-left px-3 py-2">고객</th>
                <th class="text-left px-3 py-2">스트링</th>
                <th class="text-left px-3 py-2">텐션</th>
                <th class="text-left px-3 py-2">라켓/희망일</th>
                <th class="text-left px-3 py-2">메모</th>
                <th class="text-left px-3 py-2">상태</th>
                <th class="text-right px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr class="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td class="px-3 py-2">{r.id}</td>
                  <td class="px-3 py-2 whitespace-nowrap">{TYPE_LABEL[r.type] ?? r.type}</td>
                  <td class="px-3 py-2 whitespace-nowrap">{escapeHtml(r.customerName)}</td>
                  <td class="px-3 py-2">{escapeHtml(r.stringType ?? r.stringCustom ?? '-')}</td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    {r.tensionMain != null ? `${r.tensionMain}${r.tensionCross != null ? ` / ${r.tensionCross}` : ''}` : '-'}
                  </td>
                  <td class="px-3 py-2">
                    <div>{r.racketModel ? escapeHtml(r.racketModel) : '-'}</div>
                    {r.jobDate && <div class="text-xs text-slate-500">{r.jobDate}</div>}
                  </td>
                  <td class="px-3 py-2 max-w-xs">{r.memo ? <span class="text-slate-600">{escapeHtml(r.memo)}</span> : <span class="text-slate-400">-</span>}</td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    {r.status === 'new'
                      ? <span class="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-px">신규</span>
                      : r.status === 'done'
                        ? <span class="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-px">완료</span>
                        : <span class="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-px">반려</span>}
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    {r.type === 'job' && r.status === 'new' && (
                      <a href={`/rhksflwk/new?request=${r.id}`} class="text-emerald-600 hover:underline" title="이 신청 내용으로 작업 이력 등록">이력으로 등록</a>
                    )}
                    {r.status === 'new' && (
                      <form method="post" action={`/rhksflwk/requests/${r.id}/done`} class="inline">
                        <button class="text-blue-600 hover:underline ml-2">완료</button>
                      </form>
                    )}
                    {r.status === 'new' && (
                      <form method="post" action={`/rhksflwk/requests/${r.id}/dismiss`} class="inline">
                        <button class="text-slate-500 hover:underline ml-2">반려</button>
                      </form>
                    )}
                    <form method="post" action={`/rhksflwk/requests/${r.id}/delete`} class="inline" onsubmit="return confirm('이 신청을 삭제하시겠습니까?')">
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

// ----- 상태 변경 -----
async function setStatus(c: any, status: 'done' | 'dismissed') {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const res = await db.update(requestsTbl).set({ status }).where(eq(requestsTbl.id, id)).returning({ id: requestsTbl.id }).all()
  if (res.length === 0) return c.notFound()
  return toastRedirect('/rhksflwk/requests', status === 'done' ? '신청을 완료 처리했습니다.' : '신청을 반려했습니다.')
}

requestsRoutes.post('/:id/done', (c) => setStatus(c, 'done'))
requestsRoutes.post('/:id/dismiss', (c) => setStatus(c, 'dismissed'))

// ----- 삭제 -----
requestsRoutes.post('/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.notFound()
  const db = getDb(c.env.DB)
  const res = await db.delete(requestsTbl).where(eq(requestsTbl.id, id)).returning({ id: requestsTbl.id }).all()
  if (res.length === 0) return c.notFound()
  return toastRedirect('/rhksflwk/requests', '신청이 삭제되었습니다.')
})
