// import_jobs.mjs
// 시트의 작업 이력 데이터를 파싱하여 customers / rackets / string_jobs INSERT SQL을 생성
// 실행: node scripts/import_jobs.mjs > scripts/jobs_import.sql
// 이후: npx wrangler d1 execute stringing_history_db --remote --file=./scripts/jobs_import.sql

import { JOBS as data } from './jobs_data.mjs'

// --- 파싱 헬퍼 ---
function parseTension(t) {
  if (!t || !String(t).trim()) return { main: null, cross: null }
  const s = String(t).replace(/[\s\u00a0]/g, '')
  const parts = s.split(/[/\/xX•·]/).map((p) => { const n = Number(p); return Number.isFinite(n) ? n : null })
  return { main: parts[0] ?? null, cross: parts[1] ?? null }
}

function parseCut(c) {
  // "8.2x 7.5" / "9x8" / "8.0x7.2" 형태 → main, cross
  if (!c || !String(c).trim()) return { main: null, cross: null }
  const s = String(c).replace(/[\s\u00a0]/g, '').replace(/x/gi, '/')
  const parts = s.split('/').map((p) => { const n = Number(p); return Number.isFinite(n) ? n : null })
  return { main: parts[0] ?? null, cross: parts[1] ?? null }
}

const esc = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`)

// --- 컬렉션 ---
const customers = []          // [id, name]
const rackets = []            // [id, customerId, model, head, pattern, nickname]
const jobs = []               // [date, customerName, stringType, main, cross, racketName, nick, mainCut, crossCut, memo]

const customerIndex = {}
const racketKey = {}

for (const row of data) {
  const [date, custName, stringType, tension, racketName, head, pattern, cut, memo] = row

  // 고객 등록 (비고의 쿠폰은 memo, 고객명 제거 공백)
  let cid = customerIndex[custName]
  if (!cid) {
    cid = customers.length + 1
    customerIndex[custName] = cid
    customers.push([cid, custName])
  }

  // 라켓 key: 고객 + 모델 (+헤드/패턴)
  const key = `${custName}|${racketName}|${head}|${pattern}`
  let rid = racketKey[key]
  if (!rid) {
    rid = rackets.length + 1
    racketKey[key] = rid
    rackets.push([rid, cid, racketName, head, pattern, null])
  }

  const t = parseTension(tension)
  const c = parseCut(cut)
  jobs.push([date, stringType, t.main, t.cross, rid, c.main, c.cross, memo])
}

// --- SQL 생성 ---
const out = []
out.push('-- generated: 작업 이력 이관 (시트)')
out.push('')

out.push('-- customers')
for (const [id, name] of customers) {
  out.push(`INSERT INTO customers (id, name) VALUES (${id}, ${esc(name)});`)
}
out.push('')
// sqlite_sequence 갱신 (AUTOINCREMENT)
out.push(`INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('customers', ${customers.length});`)
out.push('')

out.push('-- rackets')
for (const [id, cid, model, head, pattern, nick] of rackets) {
  out.push(`INSERT INTO rackets (id, customer_id, racket_model, nickname, head_size, string_pattern) VALUES (${id}, ${cid}, ${esc(model)}, ${esc(nick)}, ${head == null ? 'NULL' : head}, ${esc(pattern)});`)
}
out.push('')
out.push(`INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('rackets', ${rackets.length});`)
out.push('')

out.push('-- string_jobs')
for (const [date, stringType, main, cross, rid, mc, cc, memo] of jobs) {
  out.push(`INSERT INTO string_jobs (racket_id, string_type, tension_main, tension_cross, cut_length_main, cut_length_cross, job_date, memo) VALUES (${rid}, ${esc(stringType)}, ${main == null ? 'NULL' : main}, ${cross == null ? 'NULL' : cross}, ${mc == null ? 'NULL' : mc}, ${cc == null ? 'NULL' : cc}, ${esc(date)}, ${esc(memo)});`)
}
out.push('')

console.log(out.join('\n'))
console.error(`// customers=${customers.length} rackets=${rackets.length} jobs=${jobs.length}`)