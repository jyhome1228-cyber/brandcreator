# WEB DESIGN SYSTEM — STRUCTURAL FOUNDATION

BrandCreator의 웹 UI는 절제되고 체계적인 프로덕트 디자인 구조를 사용한다. 특정 서비스의 시각 스타일을 복제하지 않으며, 특정 브랜드 컬러나 오렌지 계열 컬러를 하드코딩하지 않는다. 이 문서는 컬러가 아닌 Layout, Spacing, Typography, Radius, Component Size, Hierarchy, Interaction, Responsive Structure를 정의한다.

## Core Principle

우선순위는 `clarity → hierarchy → spacing → consistency`다.

- 장식보다 기능과 정보 구조를 우선한다.
- 모든 섹션을 카드로 만들지 않는다.
- 모든 요소에 border/shadow를 적용하지 않는다.
- 여백으로 그룹을 구분한다.
- 임의의 spacing/font-size/radius 값을 만들지 않는다.
- 동일 컴포넌트는 동일한 크기와 간격 규칙을 사용한다.

## Layout

- 일반 콘텐츠: max-width 1040px
- 넓은 작업/편집 화면: max-width 1280–1440px
- Reading width: 680–760px
- Desktop: 12 columns / gap 24–32px / outer margin 24–32px
- Mobile gutter: 16px
- Tablet gutter: 24px
- Desktop gutter: 24–32px

### Breakpoints

- Mobile: 0–479px
- Small: 480–767px
- Tablet: 768–1279px
- Desktop: 1280–1439px
- Wide: 1440px+

768px 미만은 1 column을 기본으로 하며 editor sidebar/settings는 순차형 UI로 전환한다.

## Spacing

Core scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 56 / 64`

- 동일 정보 내부: 4–8px
- Label/Input: 6–8px
- Field/Field: 16–24px
- Content Group: 16–40px
- Section/Section: 64–120px

## Typography

UI 기본 서체 우선순위: Pretendard → SUIT → Noto Sans KR → sans-serif

Size scale: `11 / 12 / 13 / 14 / 16 / 18 / 20 / 22 / 24 / 26 / 28 / 32 / 40 / 48px`

Weight는 Regular / Medium / SemiBold / Bold 중심으로 제한한다.

## Radius

- 일반 UI: 8px
- 큰 Input/Button: 12px
- Card: 12–16px
- Chip: pill

모든 요소를 과도하게 둥글게 만들지 않는다.

## Controls

- Compact button/input: 40px
- Large input: 52px
- Main CTA: 52px
- 한 화면의 가장 강한 Primary CTA는 원칙적으로 1개
- Secondary + Primary 조합을 기본으로 사용
- Form은 Label → Input → Description/Error 구조 유지

## Cards / Divider

Card는 독립적인 정보 단위에서만 사용한다. 큰 의미 단위 구분은 divider보다 whitespace를 우선한다.

## Interaction

Interactive component는 Default / Hover / Pressed / Focus / Disabled 상태를 고려한다. Selectable control은 Selected, Form control은 Error/Read Only 상태를 추가한다.

## Accessibility

- Focus state를 제거하지 않는다.
- Icon-only action은 accessible label을 제공한다.
- 키보드 탐색 순서와 시각적 순서를 일치시킨다.

## Color Exception

이 시스템은 컬러를 정의하지 않는다. 웹 제품 UI 컬러 토큰과 사용자가 생성하는 브랜드 가이드 문서의 브랜드 컬러는 별도 계층으로 관리한다.

- Web UI: `--ui-*` token
- Generated document: project Brand Color data

업로드한 브랜드 컬러가 웹 서비스 전체 UI 컬러를 자동으로 변경하지 않는다.

## Final Check

- Grid/container가 일관적인가?
- Random spacing/font/radius가 없는가?
- 가장 중요한 CTA가 명확한가?
- Card/divider/shadow를 남용하지 않았는가?
- Mobile이 desktop 축소판이 아닌 별도 구조로 최적화됐는가?
- 콘텐츠 관계가 spacing만으로도 이해되는가?

최종 결과는 clean, structured, product-oriented, highly usable, minimal but not empty, consistent, responsive 해야 한다.
