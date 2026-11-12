# bramer. (브레이머)

**로고만 있으면, 브랜드 가이드라인이 뚝딱.**

기존 BrandCreator에서 리브랜딩한 BRAMER은 로고 SVG와 최소한의 브랜드 데이터를 입력하면 A4 가로형 브랜드 가이드라인을 자동 생성하는 웹 애플리케이션입니다.

## Core capabilities

- 브랜드명 / 브랜드 설명 입력
- Primary Logo SVG 업로드
- SVG 기본 분석 및 컬러 추출
- Brand Color 입력 및 HEX / RGB / CMYK 표기
- Typography 입력
- LOGO / COLOR / TYPOGRAPHY 중심의 가이드라인 자동 구성
- 페이지별 미리보기 및 ON/OFF
- PDF Export
- 현재 페이지 SVG Export
- 전체 페이지 SVG ZIP Export

Application(명함, 봉투 등)은 V1에서 제외합니다.

## Product Structure

웹 UI와 출력 문서의 디자인 시스템을 분리합니다.

- `src/design-system`: 웹 서비스 UI 규칙 및 컴포넌트
- `src/guideline-system`: A4 가이드라인 문서 토큰 및 페이지 템플릿
- `src/engines`: SVG/컬러/가이드 생성 로직
- `src/export`: PDF/SVG/ZIP 출력 로직

## Development

```bash
npm install
npm run dev
```

기본 스택은 React + TypeScript + Vite입니다.

## Industry-aware guideline builder (research prototype)

- Select from eight industry categories, then adjust eight guideline modules individually.
- Core / Selective / Extended are **editable initial hypotheses**, not empirical findings from the 22-brand analysis. Replace preset assignments with evidence-backed classifications before publication.
- Original Logo / Color / Typography pages are included or excluded based on the selected modules, and this selection is reflected in SVG / PDF export.
- Optional Graphic / Motion, Photography, Verbal Identity and Application modules currently produce visibly marked **draft worksheets**. They are NOT finished brand standards: final brand-specific rules and examples require further authoring.
- The existing SVG analysis, clear-space and minimum-size settings, and export functions remain available.

### Validation still required

Run `npm install && npm run build` locally or in CI. Verify on desktop/mobile, confirm all selected page groups appear in PDF/SVG exports, and assess worksheet design and content quality before merging to `main`.

## BRAMER experience

- Monochrome product identity and responsive layout polish.
- Industry-aware module selector with editable recommendation tiers and reset option.
- 'Core / Selective / Extended' are provisional research presets, not validated empirical findings.
- Onboarding, live preview, grouped page editor and exports retain the existing workflow.

### V2 workflow
1. Select an industry and adjust the provisional Core / Selective / Extended guideline modules.
2. Upload the primary SVG and specify the brand colors, typography and logo rules.
3. Generate the document and edit the Graphic / Motion, Photography, Verbal Identity and Application content from the page editor.
4. Export the selected pages to SVG or PDF. Save the editable project as JSON; import it later to continue work.
5. Pages with incomplete optional sections are visibly labeled DRAFT until the user fills out their text. Filled text is still subject to professional review.

### Brand naming
Public-facing identity: **bramer. / 브레이머**, tagline **로고만 있으면, 브랜드 가이드라인이 뚝딱.**
Domain and trademark clearance have not been completed.
