import type { FC } from 'hono/jsx'
import { escapeHtml } from '../lib/validation'

type CustomerLite = { id: number; name: string }
type RacketLite = {
  id: number
  customerId: number
  racketModel: string
  nickname: string | null
  headSize: number | null
  stringPattern: string | null
}

type JobValues = {
  racketId: number
  stringType: string
  stringId?: number | null
  tensionMain: number | null
  tensionCross: number | null
  cutLengthMain: number | null
  cutLengthCross: number | null
  jobDate: string
  price: number | null
  memo: string | null
}

export const JobForm: FC<{
  customers: CustomerLite[]
  presetCustomerId: number | null
  presetCustomerName?: string | null
  presetRackets: RacketLite[]
  allRacketsByCustomer?: Record<number, RacketLite[]>
  masterStrings?: { id: number; brand: string; name: string; gauge: string | null; remainingUses?: number | null }[]
  isEdit: boolean
  editId?: number
  values?: JobValues
}> = ({ customers, presetCustomerId, presetCustomerName, presetRackets, allRacketsByCustomer, masterStrings, isEdit, editId, values }) => {
  const today = new Date().toISOString().slice(0, 10)
  const v: JobValues = values ?? {
    racketId: 0, stringType: '', stringId: null, tensionMain: null, tensionCross: null,
    cutLengthMain: null, cutLengthCross: null,
    jobDate: today, price: null, memo: null,
  }
  const action = isEdit ? `/rhksflwk/edit/${editId}` : '/rhksflwk/new'
  const hasDynamicRackets = !!allRacketsByCustomer
  // 서버 렌더링 시 라켓 select에 현재 presetCustomerId의 라켓을 미리 채워둠
  const initialRackets: RacketLite[] = presetCustomerId != null
    ? (allRacketsByCustomer?.[presetCustomerId] ?? presetRackets)
    : presetRackets
  return (
    <form method="post" action={action} class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">고객 <span class="text-red-500">*</span></span>
          <input id="customer_id_input" name="customer_id_input" list="customer-list" required placeholder="고객명을 검색하세요" value={presetCustomerName ?? ''} class="border border-slate-300 rounded px-3 py-2" />
          <datalist id="customer-list">
            {customers.map((c) => (
              <option value={escapeHtml(c.name)} data-customer-id={c.id}>{escapeHtml(c.name)}</option>
            ))}
          </datalist>
          <input type="hidden" name="customer_id" id="customer_id" value={presetCustomerId ?? ''} />
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">라켓 <span class="text-red-500">*</span></span>
          <select id="racket_id" name="racket_id" class="border border-slate-300 rounded px-3 py-2">
            <option value="">-- 라켓 선택 --</option>
            {initialRackets.map((r) => (
              <option value={r.id} {...(r.id === v.racketId ? { selected: true } : {})}>
                {escapeHtml(r.racketModel)}
                {r.nickname ? ` (${escapeHtml(r.nickname)})` : ''}
                {r.headSize != null || r.stringPattern
                  ? ` · ${r.headSize != null ? `${r.headSize}sq.in` : ''}${r.headSize != null && r.stringPattern ? ' / ' : ''}${r.stringPattern ? escapeHtml(r.stringPattern) : ''}`
                  : ''}
              </option>
            ))}
          </select>
          <span class="text-xs text-slate-500 mt-1">고객 선택 시 해당 라켓이 로드됩니다.</span>
        </label>

        <fieldset class="md:col-span-2 border border-slate-200 rounded p-3">
          <legend class="text-xs text-slate-600 px-1">신규 고객 등록 (목록에 없는 고객인 경우)</legend>
          <div class="flex gap-2 items-end">
            <label class="flex-1 flex flex-col text-sm">
              <span class="text-slate-500 mb-1">고객명</span>
              <input id="new_customer_name" name="new_customer_name" placeholder="예: 홍길동" class="border border-slate-300 rounded px-3 py-2 text-sm" />
            </label>
            <button type="button" id="add-customer-btn" onclick="addCustomerInline()" class="bg-slate-200 hover:bg-slate-300 px-3 py-2 rounded text-sm whitespace-nowrap">추가</button>
          </div>
          <p id="new-customer-msg" class="text-xs text-green-600 mt-1 hidden">✓ 추가됨 — 위 고객 선택에서 선택하세요</p>
        </fieldset>

        <fieldset class="md:col-span-2 border border-slate-200 rounded p-3">
          <legend class="text-xs text-slate-600 px-1">신규 라켓 등록 (선택된 고객名下에 추가)</legend>
          <div class="grid gap-2 md:grid-cols-2">
            <input name="new_racket_model" placeholder="신규 라켓 모델" class="border border-slate-300 rounded px-3 py-2 text-sm" />
            <input name="new_racket_nickname" placeholder="별칭 (선택)" class="border border-slate-300 rounded px-3 py-2 text-sm" />
            <input name="new_head_size" type="number" step="0.1" placeholder="헤드사이즈 (sq.in)" class="border border-slate-300 rounded px-3 py-2 text-sm" />
            <input name="new_string_pattern" placeholder="스트링 패턴 (예: 16x19)" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
        </fieldset>

        <label class="flex flex-col text-sm md:col-span-2">
          <span class="text-slate-600 mb-1">스트링 종류 <span class="text-red-500">*</span> <span class="text-xs text-slate-500">(보유 스트링 자동완성 · 없으면 직접 입력)</span></span>
          <input id="string_type" name="string_type" required list="string-master-list" value={v.stringType} placeholder="예: Wilson Natural Gut 16" class="border border-slate-300 rounded px-3 py-2" />
          <datalist id="string-master-list">
            {(masterStrings ?? []).map((m) => (
              <option value={`${m.brand} ${m.name}${m.gauge ? ` ${m.gauge}` : ''}`} data-string-id={m.id} data-remaining={m.remainingUses ?? ''}>{escapeHtml(m.brand)} {escapeHtml(m.name)}{m.gauge ? ` ${escapeHtml(m.gauge)}` : ''}</option>
            ))}
          </datalist>
          <input type="hidden" name="string_id" id="string_id" value={v.stringId ?? ''} />
          <span id="string-match-info" class="text-xs text-blue-600 mt-1 hidden">✓ 보유 스트링에서 선택됨</span>
          <span id="string-remaining-info" class="text-xs text-emerald-700 mt-1 hidden"></span>
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">메인 텐션 (lbs)</span>
          <input type="number" step="0.5" name="tension_main" value={v.tensionMain ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">크로스 텐션 (lbs, 단일이면 비움)</span>
          <input type="number" step="0.5" name="tension_cross" value={v.tensionCross ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">컷 길이 — 메인 (라켓 길이)</span>
          <input type="number" step="0.05" name="cut_length_main" value={v.cutLengthMain ?? ''} placeholder="예: 8.25" class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">컷 길이 — 크로스 (라켓 길이)</span>
          <input type="number" step="0.05" name="cut_length_cross" value={v.cutLengthCross ?? ''} placeholder="예: 7.5" class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">비용 (원)</span>
          <input type="number" step="100" name="price" value={v.price ?? ''} class="border border-slate-300 rounded px-3 py-2" />
        </label>

        <label class="flex flex-col text-sm">
          <span class="text-slate-600 mb-1">작업일 <span class="text-red-500">*</span></span>
          <input type="date" name="job_date" required value={v.jobDate} class="border border-slate-300 rounded px-3 py-2" />
        </label>
        <div />

        <label class="flex flex-col text-sm md:col-span-2">
          <span class="text-slate-600 mb-1">메모</span>
          <textarea name="memo" rows={3} class="border border-slate-300 rounded px-3 py-2">{v.memo ?? ''}</textarea>
        </label>
      </div>

      <div class="flex gap-2">
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">{isEdit ? '수정 저장' : '등록'}</button>
        <a href="/rhksflwk" class="px-4 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50">취소</a>
      </div>
      {hasDynamicRackets && (
        <script id="rackets-by-customer" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(allRacketsByCustomer) }} />
      )}
      {hasDynamicRackets && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            // 스트링 datalist 매칭 → string_id 자동 세팅
            var stInput = document.getElementById('string_type');
            var sidInput = document.getElementById('string_id');
            var matchInfo = document.getElementById('string-match-info');
            var remainingInfo = document.getElementById('string-remaining-info');
            var list = document.getElementById('string-master-list');
            if (stInput && sidInput && list) {
              var map = {};
              var remainingMap = {};
              Array.prototype.forEach.call(list.querySelectorAll('option[data-string-id]'), function (opt) {
                map[opt.getAttribute('value')] = opt.getAttribute('data-string-id');
                remainingMap[opt.getAttribute('value')] = opt.getAttribute('data-remaining');
              });
              function sync(){
                var val = stInput.value.trim();
                if (map[val]) {
                  sidInput.value = map[val];
                  if (matchInfo) matchInfo.classList.remove('hidden');
                } else {
                  sidInput.value = '';
                  if (matchInfo) matchInfo.classList.add('hidden');
                }
                var rem = remainingMap[val];
                if (remainingInfo) {
                  if (rem != null && rem !== '') {
                    var n = Number(rem);
                    remainingInfo.textContent = n === 0 ? '⚠ 이 스트링은 품절 상태입니다' : ('잔여 ' + rem + '회 (등록 시 1회 차감)');
                    remainingInfo.classList.remove('hidden');
                  } else {
                    remainingInfo.classList.add('hidden');
                  }
                }
              }
              stInput.addEventListener('input', sync);
              stInput.addEventListener('change', sync);
              sync();
            }
          })();
        ` }} />
      )}
      {hasDynamicRackets && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var data = {};
            try { data = JSON.parse(document.getElementById('rackets-by-customer').textContent || '{}'); } catch(e) { data = {}; }
            var customerSel = document.getElementById('customer_id');
            var racketSel = document.getElementById('racket_id');
            if (!customerSel || !racketSel) return;
            function fmt(r){
              var label = r.racketModel || '';
              if (r.nickname) label += ' (' + r.nickname + ')';
              if (r.headSize != null || r.stringPattern) {
                label += ' \u00b7 ';
                if (r.headSize != null) label += r.headSize + 'sq.in';
                if (r.headSize != null && r.stringPattern) label += ' / ';
                if (r.stringPattern) label += r.stringPattern;
              }
              return label;
            }
            function update(){
              var cid = customerSel.value;
              var prevSelected = racketSel.value;
              // 키 매칭을 여러 형태로 시도
              var list = data[cid] || data[Number(cid)] || data[String(cid)] || [];
              try {
                console.log('[jobs] customer change', { cid: cid, type: typeof cid, keys: Object.keys(data), found: list.length });
              } catch(_){}
              // 기존 옵션 제거 (placeholder 제외)
              while (racketSel.options.length > 1) racketSel.remove(1);
              for (var i = 0; i < list.length; i++) {
                var r = list[i];
                var opt = document.createElement('option');
                opt.value = String(r.id);
                opt.textContent = fmt(r);
                if (String(r.id) === String(prevSelected)) opt.selected = true;
                racketSel.appendChild(opt);
              }
              if (list.length === 0 && cid) {
                var none = document.createElement('option');
                none.value = '';
                none.textContent = '(해당 고객의 등록된 라켓이 없습니다)';
                none.disabled = true;
                racketSel.appendChild(none);
              }
            }
            // 고객 input 변경 시 hidden customer_id 세팅 + 라켓 로드
            var customerInput = document.getElementById('customer_id_input');
            var customerHidden = document.getElementById('customer_id');
            if (customerInput && customerHidden) {
              var customerMap = {};
              Array.prototype.forEach.call(document.querySelectorAll('#customer-list option'), function(opt){
                var id = opt.getAttribute('data-customer-id');
                var name = opt.getAttribute('value');
                if (id && name) customerMap[name] = id;
              });
              function syncCustomer(){
                var val = customerInput.value.trim();
                if (customerMap[val]) {
                  customerHidden.value = customerMap[val];
                } else {
                  customerHidden.value = '';
                }
                customerSel.value = customerHidden.value;
                update();
              }
              customerInput.addEventListener('input', syncCustomer);
              customerInput.addEventListener('change', syncCustomer);
            }
            customerSel.addEventListener('change', update);
            // SSR로 미리 채워진 옵션이 있어도 클라이언트에서 한 번 더 그려서 일관성 유지
            if (racketSel.options) {
              update();
            } else {
              document.addEventListener('DOMContentLoaded', update);
            }
            // 신규 고객 인라인 추가
            window.addCustomerInline = function(){
              var nameInput = document.getElementById('new_customer_name');
              var msg = document.getElementById('new-customer-msg');
              var name = nameInput.value.trim();
              if (!name) { nameInput.focus(); return; }
              fetch('/api/customers/inline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'name=' + encodeURIComponent(name),
              }).then(function(r){ return r.json(); }).then(function(data){
                if (!data || typeof data.id !== 'number') return;
                var exists = customerSel.querySelector('option[value="' + data.id + '"]');
                if (!exists) {
                  var opt = document.createElement('option');
                  opt.value = String(data.id);
                  opt.textContent = data.name;
                  customerSel.appendChild(opt);
                }
                customerSel.value = String(data.id);
                nameInput.value = '';
                if (data.alreadyExists) {
                  msg.textContent = '✓ 기존 고객입니다 — 선택됨';
                } else {
                  msg.textContent = '✓ 추가됨 — 위 고객 선택에서 선택하세요';
                }
                msg.classList.remove('hidden');
                customerSel.dispatchEvent(new Event('change'));
              }).catch(function(){ msg.textContent = '추가 실패'; msg.classList.remove('hidden'); });
            };

            })();
        ` }} />
      )}
    </form>
  )
}