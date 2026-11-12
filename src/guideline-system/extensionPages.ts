import type { BrandProject, GuidelinePage } from '../types/guideline';
import type { GuidelineCategory } from '../engines/industryRecommendations';

const labels: Record<string, { title: string; subtitle: string; prompts: string[] }> = {
  graphic: { title: 'Graphic / Motion', subtitle: '그래픽·모션 사용 원칙', prompts: ['그래픽 모티프 및 반복 규칙', '아이콘·일러스트레이션 스타일', '모션 사용 환경과 속도 기준'] },
  photography: { title: 'Photography', subtitle: '사진 표현 가이드', prompts: ['조명·색감·톤앤매너', '구도·배경·피사체 처리', '권장 / 비권장 사진 사례'] },
  verbal: { title: 'Verbal Identity', subtitle: '브랜드 언어 체계', prompts: ['브랜드 보이스와 문장 어조', '핵심 메시지 및 용어', '금지 표현·문구 사용 예시'] },
  application: { title: 'Application', subtitle: '브랜드 적용 예시', prompts: ['주요 고객 접점과 채널', '디지털·인쇄 매체 적용', '운영 상황별 적용 예시'] },
};

const esc = (input: string): string => input.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Editable starter pages: do not present missing brand decisions as validated rules. */
export function generateExtensionPages(project: BrandProject, selected: GuidelineCategory[]): GuidelinePage[] {
  return (['graphic', 'photography', 'verbal', 'application'] as const)
    .filter(category => selected.includes(category))
    .map((category, index) => {
      const { title, subtitle, prompts } = labels[category];
      const ink = /^#[0-9a-f]{6}$/i.test(project.colors.primary) ? project.colors.primary : '#111111';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 2970 2100">
        <rect width="2970" height="2100" fill="#FFFFFF"/>
        <text x="110" y="145" font-family="Arial,sans-serif" font-size="76" font-weight="700" fill="${ink}">${esc(title)}</text>
        <text x="110" y="205" font-family="Arial,sans-serif" font-size="32" fill="#606060">${esc(subtitle)}</text>
        <line x1="110" y1="260" x2="2860" y2="260" stroke="${ink}" stroke-width="4"/>
        <text x="110" y="430" font-family="Arial,sans-serif" font-size="44" font-weight="600" fill="#151515">BRAND SYSTEM / WORKSHEET</text>
        <text x="110" y="515" font-family="Arial,sans-serif" font-size="30" fill="#777777">브랜드에 맞는 아래의 규칙을 확정한 뒤 최종 가이드라인으로 사용하세요.</text>
        ${prompts.map((text, i) => `<g transform="translate(110 ${640 + i * 390})"><rect width="2750" height="325" fill="#F7F7F7"/><text x="50" y="75" font-family="Arial,sans-serif" font-size="35" font-weight="600" fill="#111111">0${i + 1}  ${esc(text)}</text><text x="50" y="150" font-family="Arial,sans-serif" font-size="28" fill="#858585">브랜드 기준 작성 필요 · 내용을 확정하기 전에는 대외 배포하지 마세요.</text><line x1="50" y1="230" x2="2700" y2="230" stroke="#D9D9D9" stroke-width="2"/></g>`).join('')}
        <line x1="110" y1="1900" x2="2860" y2="1900" stroke="#DDDDDD" stroke-width="2"/>
        <text x="110" y="1970" font-family="Arial,sans-serif" font-size="27" fill="#777777">${esc(project.englishName || project.name || 'Brand')}</text>
        <text x="2860" y="1970" font-family="Arial,sans-serif" font-size="27" fill="#777777" text-anchor="end">DRAFT / REQUIRES REVIEW</text>
      </svg>`;
      return { id: `19-extension-${index}-${category}`, section: category, title, subtitle, svg };
    });
}
