import type { FC } from 'hono/jsx'
import { escapeHtml } from '../lib/validation'

type StringValues = {
  brand: string
  name: string
  category: string
  shape?: string | null
  gauge?: string | null
  color?: string | null
  stiffnessRa?: number | null
  tensionLossPct?: number | null
  spinPotential?: number | null
  cost?: number | null
  memo?: string | null
}

export const StringForm: FC<{
  isEdit: boolean
  editId?: number
  categories: Record<string, string>
  shapes: Record<string, string>
  colors: Record<string, string>
  values?: StringValues
}> = ({ isEdit, editId, categories, shapes, colors, values }) => {
  const v: StringValues = values ?? {
    brand: '', name: '', category: 'polyester',
    shape: null, gauge: '', color: null,
    stiffnessRa: null, tensionLossPct: null, spinPotential: null,
    cost: null, memo: null,
  }
  const action = isEdit ? `/rhksflwk/strings/${editId}/edit` : '/rhksflwk/strings'
  return (
    <form method="post" action={action} class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">브랜드 <span class="text-red-500">*</span></span>
          <input name="brand" required value={escapeHtml(v.brand)} placeholder="예: Wilson, Luxilon, Yonex" class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">이름 <span class="text-red-500">*</span></span>
          <input name="name" required value={escapeHtml(v.name)} placeholder="예: Natural Gut, Alu Power" class="border border-slate-300 rounded px-3 py-2" />
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">카테고리 <span class="text-red-500">*</span></span>
          <select name="category" required class="border border-slate-300 rounded px-3 py-2">
            {Object.entries(categories).map(([k, label]) => (
              <option value={k} {...(v.category === k ? { selected: true } : {})}>{label}</option>
            ))}
          </select>
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">두께 (mm)</span>
          <input name="gauge" value={v.gauge ?? ''} placeholder="예: 1.25, 1.30" class="border border-slate-300 rounded px-3 py-2" />
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">형태 <span class="text-xs text-slate-400">(직접 입력 가능)</span></span>
          <input
            name="shape"
            list="shape-options"
            value={escapeHtml(v.shape ?? '')}
            placeholder="예: 10각꼬임, 원형, 러프"
            class="border border-slate-300 rounded px-3 py-2"
          />
          <datalist id="shape-options">
            {Object.entries(shapes).map(([k, label]) => (
              <option value={k}>{label}</option>
            ))}
          </datalist>
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">색상</span>
          <select name="color" class="border border-slate-300 rounded px-3 py-2">
            <option value="">-</option>
            {Object.entries(colors).map(([k, label]) => (
              <option value={k} {...(v.color === k ? { selected: true } : {})}>{label}</option>
            ))}
          </select>
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">강성 (RA)</span>
          <input type="number" step="0.1" name="stiffness_ra" value={v.stiffnessRa ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">텐션 로스 (%)</span>
          <input type="number" step="0.1" name="tension_loss_pct" value={v.tensionLossPct ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">스핀 잠재력</span>
          <input type="number" step="0.1" name="spin_potential" value={v.spinPotential ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">스트링 비용 (원) <span class="text-xs text-slate-500">(공임비 포함 총액)</span></span>
          <input type="number" step="100" name="cost" value={v.cost ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <div />

        <label class="flex flex-col text-sm md:col-span-2">
          <span class="text-slate-600 mb-1">관리자 메모 (공개 페이지에 노출 안 됨)</span>
          <textarea name="memo" rows={3} class="border border-slate-300 rounded px-3 py-2">{v.memo ?? ''}</textarea>
        </label>
      </div>

      <div class="flex gap-2">
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">{isEdit ? '수정 저장' : '등록'}</button>
        <a href="/rhksflwk/strings" class="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">취소</a>
      </div>
    </form>
  )
}