// Cloudflare Web Crypto 기반 랜덤 토큰 생성
export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  // base64url
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// 상수 시간 문자열 비교 (timing-attack 완화)
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  const len = Math.max(ab.length, bb.length)
  let diff = ab.length ^ bb.length
  for (let i = 0; i < len; i++) {
    const av = i < ab.length ? ab[i] : 0
    const bv = i < bb.length ? bb[i] : 0
    diff |= av ^ bv
  }
  return diff === 0
}

export function parseCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null
  const parts = header.split(';')
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx < 0) continue
    const k = p.slice(0, idx).trim()
    if (k === name) return decodeURIComponent(p.slice(idx + 1).trim())
  }
  return null
}

export function buildCookie(name: string, value: string, opts: {
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  path?: string
} = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${opts.path ?? '/'}`)
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`)
  parts.push(`HttpOnly`)
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`)
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
}