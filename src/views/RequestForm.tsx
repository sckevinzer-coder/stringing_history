import type { FC } from 'hono/jsx'
import { escapeHtml } from '../lib/validation'

export type RequestStringLite = {
  id: number
  brand: string
  name: string
  gauge: string | null
  remainingUses: number | null
}

const stringLabel = (s: RequestStringLite) =>
  `${s.brand} ${s.name}${s.gauge ? ` ${s.gauge}` : ''}`

// 스트링 검색 선택 공통 필드 (input + datalist + hidden string_id)
const StringSearchField: FC<{
  inputId: string
  listId: string
  hiddenId: string
  title: string
  required?: boolean
  presetStringId: number | null
  presetLabel: string
  options: RequestStringLite[]
}> = ({ inputId, listId, hiddenId, title, required, presetStringId, presetLabel, options }) => (
  <label class="flex flex-col text-sm">
    <span class="text-slate-600 mb-1">{title} {required && <span class="text-red-500">*</span>} <span class="text-xs text-slate-500">(검색 후 선택)</span></span>
    <input id={inputId} list={listId} required={required} placeholder="스트링명을 검색하세요" value={presetLabel} class="border border-slate-300 rounded px-3 py-2" />
    <datalist id={listId}>
      {options.map((s) => (
        <option value={escapeHtml(stringLabel(s))} data-string-id={s.id}>{escapeHtml(stringLabel(s))}</option>
      ))}
    </datalist>
    <input type="hidden" name="string_id" id={hiddenId} value={presetStringId ?? ''} />
  </label>
)

// datalist 선택값을 hidden string_id에 동기화 (입력 쌍이 없어도 무시)
const stringSearchScript = `
  (function(){
    if (window.__bindStringSearch) return;
    window.__bindStringSearch = function(inputId, hiddenId, listId){
      var input = document.getElementById(inputId);
      var hidden = document.getElementById(hiddenId);
      var list = document.getElementById(listId);
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
    };
    window.__bindStringSearch('job_string_input', 'job_string_id', 'job-string-list');
    window.__bindStringSearch('purchase_string_input', 'purchase_string_id', 'purchase-string-list');
  })();
`

export const RequestForm: FC<{
  reqType: 'job' | 'purchase'
  strings: RequestStringLite[]
  presetStringId: number | null
}> = ({ reqType, strings, presetStringId }) => {
  const isJob = reqType === 'job'
  const presetLabel = presetStringId != null
    ? (() => { const f = strings.find((s) => s.id === presetStringId); return f ? stringLabel(f) : '' })()
    : ''
  const jobOptions = strings.filter((s) => s.remainingUses !== 0)
  return (
    <form method="post" action="/apply" class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <input type="hidden" name="type" value={reqType} />
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">이름 <span class="text-red-500">*</span></span>
          <input name="customer_name" required placeholder="예: 홍길동" class="border border-slate-300 rounded px-3 py-2" />
        </label>

        {isJob ? (
          <StringSearchField
            inputId="job_string_input" listId="job-string-list" hiddenId="job_string_id"
            title="스트링" required presetStringId={presetStringId} presetLabel={presetLabel} options={jobOptions}
          />
        ) : (
          <StringSearchField
            inputId="purchase_string_input" listId="purchase-string-list" hiddenId="purchase_string_id"
            title="스트링 선택" presetStringId={presetStringId} presetLabel={presetLabel} options={strings}
          />
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
      <script dangerouslySetInnerHTML={{ __html: stringSearchScript }} />
    </form>
  )
}
