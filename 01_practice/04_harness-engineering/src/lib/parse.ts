// 임의의 텍스트(번호 단독 / URL / 뉴스 문장)에서 첫 번째 CVE ID를 찾아 정규화해 반환.
// 없으면 null. 부수효과 없는 순수 함수.
const CVE_PATTERN = /CVE-\d{4}-\d{4,}/i;

export function extractCveId(text: string): string | null {
  const match = text.match(CVE_PATTERN);
  return match ? match[0].toUpperCase() : null;
}
