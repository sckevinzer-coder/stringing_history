// 입력 검증 / 정규화 헬퍼

export function trimOrNull(v: unknown): string | null {
  if (v == null) return null
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length === 0 ? null : s
}

export function requireString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ValidationError(`${field}는(은) 필수입니다.`)
  }
  return v.trim()
}

export function toNumberOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  return n
}

export function toDateOrThrow(v: unknown, field: string): string {
  const s = requireString(v, field)
  // YYYY-MM-DD 형식만 허용
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new ValidationError(`${field}는 YYYY-MM-DD 형식이어야 합니다.`)
  }
  const d = new Date(s + 'T00:00:00Z')
  if (isNaN(d.getTime())) throw new ValidationError(`${field} 값이 올바르지 않습니다.`)
  return s
}

export class ValidationError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ValidationError' }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`)
}

export function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}