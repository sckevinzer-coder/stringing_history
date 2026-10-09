import type { FC } from 'hono/jsx'
import { escapeHtml } from '../lib/validation'
import {
  categoryLabel,
  shapeLabel,
  colorLabel,
  summaryLine,
  formatCost,
  formatStiffnessRa,
  formatSpinPotential,
} from '../lib/stringLabels'

export type StringCardData = {
  id: number
  brand: string
  name: string
  category: string
  shape?: string | null
  gauge?: string | null
  color?: string | null
  stiffnessRa?: number | string | null
  tensionLossPct?: number | null
  spinPotential?: number | null
  cost?: number | null
  remainingUses?: number | null
}

export const StringCard: FC<{ s: StringCardData }> = ({ s }) => {
  const domId = `string-details-${s.id}`
  const displayTotal = s.cost != null ? Number(s.cost) : null
  return (
    <div class="bg-white border border-slate-200 rounded-lg p-4">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs text-slate-500 uppercase tracking-wide">{escapeHtml(s.brand)}</div>
          <div class="text-lg font-semibold mt-0.5">{escapeHtml(s.name)}</div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-slate-900">{formatCost(displayTotal)}</div>
          {displayTotal != null && <div class="text-[10px] text-slate-400">공임포함</div>}
        </div>
      </div>
      <div class="mt-2 text-sm text-slate-600">{summaryLine({ gauge: s.gauge ?? null, category: s.category, color: s.color ?? null, shape: s.shape ?? null })}</div>
      {s.remainingUses != null && (
        s.remainingUses > 0
          ? <div class="mt-1.5 inline-block text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">잔여 {s.remainingUses}회</div>
          : <div class="mt-1.5 inline-block text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">품절</div>
      )}
      <div class="mt-3 flex items-center gap-3">
        <button
          type="button"
          class="text-xs text-blue-600 hover:underline flex items-center gap-1"
          onclick={`document.getElementById('${domId}').classList.toggle('hidden'); var b=this; var t=b.textContent.trim(); b.textContent = (t==='상세 ▼' ? '상세 ▲' : '상세 ▼');`}
        >
          상세 ▼
        </button>
        {s.remainingUses === 0 ? (
          <a href={`/apply?type=purchase&string=${s.id}`} class="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 hover:bg-amber-100">구매 요청</a>
        ) : (
          <a href={`/apply?type=job&string=${s.id}`} class="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 hover:bg-emerald-100">신청</a>
        )}
      </div>
      <div id={domId} class="hidden mt-3 pt-3 border-t border-slate-100 text-sm">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <dt class="text-slate-500">카테고리</dt>
          <dd>{categoryLabel(s.category)}</dd>
          <dt class="text-slate-500">두께 (mm)</dt>
          <dd>{s.gauge ? escapeHtml(s.gauge) : '-'}</dd>
          <dt class="text-slate-500">색상</dt>
          <dd>{colorLabel(s.color ?? null)}</dd>
          <dt class="text-slate-500">형태</dt>
          <dd>{shapeLabel(s.shape ?? null)}</dd>
          <dt class="text-slate-500">강성 (RA)</dt>
          <dd>{formatStiffnessRa(s.stiffnessRa ?? null)}</dd>
          <dt class="text-slate-500">텐션 로스 (%)</dt>
          <dd>{s.tensionLossPct ?? '-'}</dd>
          <dt class="text-slate-500">스핀 잠재력</dt>
          <dd>{formatSpinPotential(s.spinPotential ?? null)}</dd>
        </dl>
      </div>
    </div>
  )
}