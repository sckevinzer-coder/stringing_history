// 스트링 마스터 데이터의 코드값 ↔ 라벨 매핑
// category는 영어 키 고정, shape/color는 한글 값을 그대로 저장 (자유 텍스트 허용)

export const STRING_CATEGORIES = {
  natural_gut: '천연 거트',
  polyester: '폴리',
  multifilament: '멀티필라멘트',
  synthetic_gut: '합성 거트',
  hybrid: '하이브리드',
} as const

export type StringCategory = keyof typeof STRING_CATEGORIES

export const STRING_SHAPES = {
  '원형': '원형',
  '5각': '5각',
  '6각': '6각',
  '7각': '7각',
  '7각꼬임': '7각꼬임',
  '8각': '8각',
  '10각': '10각',
  '10각꼬임': '10각꼬임',
  '원형꼬임': '원형꼬임',
  '러프': '러프',
  '사각': '사각',
} as const

export type StringShape = keyof typeof STRING_SHAPES

export const STRING_COLORS = {
  '하늘': '하늘',
  '회색': '회색',
  '노랑': '노랑',
  '검정': '검정',
  '주황': '주황',
  '빨강': '빨강',
  '녹색': '녹색',
  '라벤더': '라벤더',
  '형광': '형광',
  '파랑': '파랑',
  '핑크': '핑크',
  '원색': '원색',
  '흰색': '흰색',
  '골드': '골드',
  '실버': '실버',
} as const

export type StringColor = keyof typeof STRING_COLORS

export function categoryLabel(c: string | null | undefined): string {
  if (!c) return '-'
  return (STRING_CATEGORIES as Record<string, string>)[c] ?? c
}

export function shapeLabel(s: string | null | undefined): string {
  if (!s) return '-'
  return (STRING_SHAPES as Record<string, string>)[s] ?? s
}

export function colorLabel(c: string | null | undefined): string {
  if (!c) return '-'
  return (STRING_COLORS as Record<string, string>)[c] ?? c
}

export function formatGauge(g: string | null | undefined): string {
  if (!g) return '-'
  // 숫자만으로 이루어진 값이면 mm 단위로 표시
  if (/^\d+(\.\d+)?$/.test(g.trim())) return `${g.trim()} mm`
  return g
}

// 카드의 "기본 정보" 한 줄 텍스트
export function summaryLine(opts: {
  gauge?: string | null
  category?: string | null
  shape?: string | null
  color?: string | null
}): string {
  const parts: string[] = []
  if (opts.gauge) parts.push(formatGauge(opts.gauge))
  if (opts.category) parts.push(categoryLabel(opts.category))
  if (opts.color) parts.push(colorLabel(opts.color))
  if (opts.shape) parts.push(shapeLabel(opts.shape))
  return parts.join(' · ') || '-'
}

// 포맷 유틸
export function formatCost(n: number | null | undefined): string {
  if (n == null) return '-'
  return `₩${Number(n).toLocaleString('ko-KR')}`
}

// 강성: 숫자면 "N RA", 텍스트("부드러움" 등)면 그대로
export function formatStiffnessRa(n: number | string | null | undefined): string {
  if (n == null || n === '') return '-'
  if (typeof n === 'string') return n
  return `${n} RA`
}

export function formatTensionLossPct(n: number | null | undefined): string {
  if (n == null) return '-'
  return `${n}%`
}

export function formatSpinPotential(n: number | null | undefined): string {
  if (n == null) return '-'
  return `${n}/10`
}