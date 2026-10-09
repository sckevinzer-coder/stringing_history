const REPO = 'sckevinzer-coder/stringing_history'

export type RequestDispatchPayload = {
  request_id: number
  type: 'job' | 'purchase'
  customer_name: string
  string_label: string
  tension_main: number | null
  tension_cross: number | null
  racket_model: string | null
  job_date: string | null
  memo: string | null
}

// 신청 접수 시 repository_dispatch 이벤트 발송.
// GitHub Actions가 bot 명의로 이슈를 생성한다 (본인 명의 이슈는 알림 메일이 안 옴).
// 토큰이 없거나 호출이 실패하면 false를 반환한다. 절대 예외를 던지지 않는다.
// 필요 토큰 권한: Contents 읽기/쓰기 (Issues 권한은 불필요).
export async function dispatchRequestEvent(
  token: string | undefined,
  payload: RequestDispatchPayload,
): Promise<boolean> {
  if (!token) return false
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'stringing-history-worker',
      },
      body: JSON.stringify({ event_type: 'string-request', client_payload: payload }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`GitHub dispatch 실패: ${res.status} ${detail.slice(0, 300)}`)
      return false
    }
    return true
  } catch (e) {
    console.error(`GitHub dispatch 실패: ${e}`)
    return false
  }
}
