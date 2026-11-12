export const INDUSTRIES = [
  { id: 'fintech', label: '금융·핀테크' },
  { id: 'commerce', label: '커머스·리테일' },
  { id: 'beauty', label: '뷰티·라이프스타일' },
  { id: 'content', label: '콘텐츠·엔터테인먼트' },
  { id: 'mobility', label: '모빌리티' },
  { id: 'service', label: '생활·서비스 플랫폼' },
  { id: 'technology', label: 'IT·테크 플랫폼' },
  { id: 'corporate', label: '기업·제조·지주' },
] as const;

export type IndustryId = typeof INDUSTRIES[number]['id'];
export type GuidelineCategory = 'overview' | 'logo' | 'color' | 'typography' | 'graphic' | 'photography' | 'verbal' | 'application';
export type RecommendationTier = 'Core' | 'Selective' | 'Extended';

export const CATEGORIES: Array<{ id: GuidelineCategory; label: string; description: string }> = [
  { id: 'overview', label: 'Brand Overview', description: '브랜드 개요·핵심 메시지' },
  { id: 'logo', label: 'Logo', description: '로고 활용·여백·최소 크기' },
  { id: 'color', label: 'Color', description: '브랜드 컬러와 조합 규칙' },
  { id: 'typography', label: 'Typography', description: '서체와 정보 위계' },
  { id: 'graphic', label: 'Graphic / Motion', description: '그래픽 언어·모션 원칙' },
  { id: 'photography', label: 'Photography', description: '사진 톤앤매너·구도' },
  { id: 'verbal', label: 'Verbal Identity', description: '브랜드 언어·표현 규칙' },
  { id: 'application', label: 'Application', description: '매체·접점별 적용 사례' },
];

const ALWAYS_CORE: GuidelineCategory[] = ['overview', 'logo', 'color'];
const SELECTIVE_BY_INDUSTRY: Record<IndustryId, GuidelineCategory[]> = {
  fintech: ['typography', 'verbal', 'application'],
  commerce: ['typography', 'photography', 'application'],
  beauty: ['typography', 'photography', 'verbal', 'application'],
  content: ['typography', 'graphic', 'photography', 'application'],
  mobility: ['typography', 'graphic', 'application'],
  service: ['typography', 'verbal', 'application'],
  technology: ['typography', 'graphic', 'verbal', 'application'],
  corporate: ['typography', 'photography', 'application'],
};

/** Preliminary workshop presets, NOT empirical findings from the 22-brand sample. */
export function getRecommendations(industry: IndustryId): Record<GuidelineCategory, RecommendationTier> {
  const selected = SELECTIVE_BY_INDUSTRY[industry];
  return Object.fromEntries(CATEGORIES.map(({ id }) => [
    id,
    ALWAYS_CORE.includes(id) ? 'Core' : selected.includes(id) ? 'Selective' : 'Extended',
  ])) as Record<GuidelineCategory, RecommendationTier>;
}

export function getDefaultSelection(industry: IndustryId): GuidelineCategory[] {
  const tiers = getRecommendations(industry);
  return CATEGORIES.filter(({ id }) => tiers[id] !== 'Extended').map(({ id }) => id);
}
