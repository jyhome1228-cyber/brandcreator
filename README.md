# BrandCreator

BrandCreator는 로고 SVG와 최소한의 브랜드 데이터를 입력하면 A4 가로형 브랜드 가이드라인을 자동 생성하는 웹 애플리케이션입니다.

## V1 Scope

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
