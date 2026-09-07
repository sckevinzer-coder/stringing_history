/**
 * 간단한 KV 기반 레이트 리밋터.
 * - 키별 카운터를 지정된 TTL(밀리초) 안에서 max 회로 제한합니다.
 * - KV가 없으면(예: 로컬 테스트) 항상 통과하도록 graceful fallback 합니다.
 */
export class RateLimiter {
  private readonly kv: KVNamespace | undefined
  private readonly max: number
  private readonly ttlMs: number

  constructor(kv: KVNamespace | undefined, max: number, ttlMs: number) {
    this.kv = kv
    this.max = max
    this.ttlMs = ttlMs
  }

  /**
   * 리밋에 걸렸는지 확인합니다. (통과 = true)
   * max 회 시도 후에는 ttlMs 동안 차단됩니다.
   */
    async try(key: string): Promise<boolean> {
    if (!this.kv) return true // KV 없으면 제한 없음
    const redisKey = `rl:${key}`
    const raw = await this.kv.get(redisKey, { type: 'json' })
    const current = raw as { count: number; reset: number } | null
    if (current !== null) {
      if (current.count >= this.max) return false // 차단
      // 카운터 증가
      await this.kv.put(redisKey, JSON.stringify({ count: current.count + 1, reset: current.reset }), {
        expirationTtl: this.ttlMs / 1000,
      })
    } else {
      // 최초 시도
      await this.kv.put(redisKey, JSON.stringify({ count: 1, reset: Date.now() + this.ttlMs }), {
        expirationTtl: this.ttlMs / 1000,
      })
    }
    return true
  }

  /** 강제로 리밋 상태 초기화 */
  async reset(key: string): Promise<void> {
    if (!this.kv) return
    await this.kv.delete(`rl:${key}`)
  }
}

/**
 * 팩토리: Hono 컨텍스트의 env에서 KV를 꺼내서 리밋터 생성
 */
export const RATE_LIMIT = {
  create(kv: KVNamespace | undefined, max: number, ttlMs: number): RateLimiter {
    return new RateLimiter(kv, max, ttlMs)
  },
}
