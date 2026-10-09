const REPO = 'sckevinzer-coder/stringing_history'

// 신청 접수 시 GitHub 이슈 자동 생성 (관리자 알림 메일용).
// 토큰이 없거나 호출이 실패하면 null을 반환한다. 절대 예외를 던지지 않는다.
export async function createRequestIssue(
  token: string | undefined,
  title: string,
  body: string,
): Promise<number | null> {
  if (!token) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`GitHub issue 생성 실패: ${res.status} ${detail.slice(0, 300)}`)
      return null
    }
    const data = (await res.json()) as { number?: number }
    return typeof data.number === 'number' ? data.number : null
  } catch (e) {
    console.error(`GitHub issue 생성 실패: ${e}`)
    return null
  }
}
