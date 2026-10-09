import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { strings } from '../db/schema'
import type { DB } from '../db/client'

// 작업 등록 시 해당 스트링의 남은 횟수 1 차감 (remaining_uses가 NULL이면 미관리 → 스킵, 0 미만 방지)
export async function consumeStringUse(db: DB, stringId: number | null | undefined) {
  if (stringId == null) return
  await db
    .update(strings)
    .set({ remainingUses: sql`max(${strings.remainingUses} - 1, 0)` })
    .where(and(eq(strings.id, stringId), isNotNull(strings.remainingUses)))
    .run()
}

// 작업 삭제 시 해당 스트링의 남은 횟수 1 복원 (NULL이면 스킵)
export async function restoreStringUse(db: DB, stringId: number | null | undefined) {
  if (stringId == null) return
  await db
    .update(strings)
    .set({ remainingUses: sql`${strings.remainingUses} + 1` })
    .where(and(eq(strings.id, stringId), isNotNull(strings.remainingUses)))
    .run()
}
