import type { FC } from 'hono/jsx'
import { escapeHtml } from '../lib/validation'

export type RequestStringLite = {
  id: number
  brand: string
  name: string
  gauge: string | null
  remainingUses: number | null
}

export const RequestForm: FC<{
  reqType: 'job' | 'purchase'
  strings: RequestStringLite[]
  presetStringId: number | null
}> = ({ reqType, strings, presetStringId }) => {
  const isJob = reqType === 'job'
  const label = (s: RequestStringLite) =>
    `${s.brand} ${s.name}${s.gauge ? ` ${s.gauge}` : ''}`
  const presetLabel = presetStringId != null
    ? (() => { const f = strings.find((s) => s.id === presetStringId); return f ? label(f) : '' })()
    : ''
  return (
    <form method="post" action="/apply" class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <input type="hidden" name="type" value={reqType} />
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">이름 <span class="text-red-500">*</span></span>
          <input name="customer_name" required placeholder="예: 홍길동" class="border border-slate-300 rounded px-3 py-2" />
        </label>

        {isJob ? (
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">스트링 <span class="text-red-500">*</span></span>
            <select name="string_id" required class="border border-slate-300 rounded px-3 py-2">
              <option value="">-- 스트링 선택 --</option>
              {strings.map((s) => {
                const soldout = s.remainingUses === 0
                return (
                  <option
                    value={s.id}
                    disabled={soldout}
                    {...(s.id === presetStringId ? { selected: true } : {})}
                  >
                    {escapeHtml(label(s))}{soldout ? ' (품절)' : ''}
                  </option>
                )
              })}
            </select>
          </label>
        ) : (
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">스트링 선택 <span class="text-xs text-slate-500">(검색 후 선택)</span></span>
            <input id="purchase_string_input" list="purchase-string-list" placeholder="스트링명을 검색하세요" value={presetLabel} class="border border-slate-300 rounded px-3 py-2" />
            <datalist id="purchase-string-list">
              {strings.map((s) => (
                <option value={escapeHtml(label(s))} data-string-id={s.id}>{escapeHtml(label(s))}</option>
              ))}
            </datalist>
            <input type="hidden" name="string_id" id="purchase_string_id" value={presetStringId ?? ''} />
          </label>
        )}

        {isJob ? (
          <>
            <label class="flex flex-col text-sm">
              <span class="text-slate-600 mb-1">메인 텐션 (lbs) <span class="text-red-500">*</span></span>
              <input type="number" step="0.5" name="tension_main" required placeholder="예: 48" class="border border-slate-300 rounded px-3 py-2" />
            </label>
            <label class="flex flex-col text-sm">
              <span class="text-slate-600 mb-1">크로스 텐션 (lbs, 단일이면 비움)</span>
              <input type="number" step="0.5" name="tension_cross" placeholder="예: 46" class="border border-slate-300 rounded px-3 py-2" />
            </label>
            <label class="flex flex-col text-sm">
              <span class="text-slate-600 mb-1">라켓 (모델/별칭)</span>
              <input name="racket_model" placeholder="예: Wilson Blade / 1번 라켓" class="border border-slate-300 rounded px-3 py-2" />
            </label>
            <label class="flex flex-col text-sm">
              <span class="text-slate-600 mb-1">희망 날짜</span>
              <input type="date" name="job_date" class="border border-slate-300 rounded px-3 py-2" />
            </label>
          </>
        ) : (
          <label class="flex flex-col text-sm">
            <span class="text-slate-600 mb-1">목록에 없는 스트링 (직접 입력)</span>
            <input name="string_custom" placeholder="예: Babolat VS Gut 16" class="border border-slate-300 rounded px-3 py-2" />
          </label>
        )}

        <label class="flex flex-col text-sm md:col-span-2">
          <span class="text-slate-600 mb-1">메모</span>
          <textarea name="memo" rows={3} placeholder={isJob ? '부가 요청사항이 있으면 적어주세요' : '수량 등 요청사항이 있으면 적어주세요'} class="border border-slate-300 rounded px-3 py-2">{''}</textarea>
        </label>
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded text-sm w-full sm:w-auto">신청하기</button>
        <a href="/strings" class="px-4 py-2.5 sm:py-2 rounded text-sm border border-slate-300 hover:bg-slate-50 text-center w-full sm:w-auto">취소</a>
      </div>
      {!isJob && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var input = document.getElementById('purchase_string_input');
            var hidden = document.getElementById('purchase_string_id');
            var list = document.getElementById('purchase-string-list');
            if (!input || !hidden || !list) return;
            var map = {};
            Array.prototype.forEach.call(list.querySelectorAll('option[data-string-id]'), function (opt) {
              map[opt.getAttribute('value')] = opt.getAttribute('data-string-id');
            });
            function sync(){
              var val = input.value.trim();
              hidden.value = map[val] || '';
            }
            input.addEventListener('input', sync);
            input.addEventListener('change', sync);
          })();
        ` }} />
      )}
    </form>
  )
}
