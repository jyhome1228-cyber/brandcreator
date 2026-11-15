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

/** Example use cases are product-design suggestions, not findings from the 22-brand study. */
export const INDUSTRY_GUIDANCE: Record<IndustryId, { focus: string; touchpoints: string[] }> = {
  fintech: { focus: '신뢰감 있는 언어와 디지털 환경에서의 일관성을 중심으로 구성합니다.', touchpoints: ['앱 화면', '서비스 아이콘', '고객 안내 문구'] },
  commerce: { focus: '상품 노출과 프로모션에서 브랜드가 일관되게 보이도록 구성합니다.', touchpoints: ['상품 이미지', '온라인 스토어', '프로모션 배너'] },
  beauty: { focus: '패키지와 제품 사진의 표현 기준을 중심으로 구성합니다.', touchpoints: ['패키지', '제품 촬영', '브랜드 메시지'] },
  content: { focus: '콘텐츠별 그래픽 표현과 움직임을 중심으로 구성합니다.', touchpoints: ['콘텐츠 썸네일', '모션 그래픽', '프로모션 이미지'] },
  mobility: { focus: '온·오프라인 이동 경험에서 일관된 시각 체계를 구축합니다.', touchpoints: ['차량 적용', '안내 사인', '서비스 화면'] },
  service: { focus: '서비스 화면과 고객 커뮤니케이션에 필요한 규칙을 구성합니다.', touchpoints: ['웹·앱', '고객 안내', '서비스 접점'] },
  technology: { focus: '디지털 제품과 기술 커뮤니케이션에 필요한 표현 기준을 구성합니다.', touchpoints: ['UI 화면', '아이콘', '기술 소개 자료'] },
  corporate: { focus: '기업의 공식 문서와 다양한 운영 접점에 적용할 규칙을 구성합니다.', touchpoints: ['기업 문서', '사인', '인쇄물'] },
};
