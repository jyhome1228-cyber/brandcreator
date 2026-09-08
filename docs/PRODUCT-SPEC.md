# BrandCreator V1 Product Spec

## Goal

로고 SVG와 최소 브랜드 데이터를 입력하면 레퍼런스 가이드라인의 구조를 기반으로 LOGO / COLOR / TYPOGRAPHY 중심의 A4 가로형 브랜드 가이드를 자동 생성한다.

## Input

필수:
- Brand Name
- Primary Logo SVG
- Primary Color

선택:
- English Brand Name
- Brand Description
- Slogan
- Secondary / Accent Color
- Title / Body Typeface
- Year

## Core Output

기본 18페이지:

1. Cover
2. Index
3. LOGO Section Cover
4. Signature Logo
5. Grid System 1
6. Grid System 2
7. Clear Space 1
8. Clear Space 2
9. Minimum Size
10. COLOR Section Cover
11. Monochromatic
12. Brand Color
13. Color Combination
14. Color Usage
15. TYPOGRAPHY Section Cover
16. Title Typeface
17. Body Typeface
18. Back Cover

Application(명함, 봉투 등)은 V1에서 제외한다.

## Document System

- A4 Landscape
- 297 × 210mm
- SVG internal coordinate: 2970 × 2100
- 웹 UI와 문서 디자인 시스템을 분리
- 각 문서 페이지를 SVG를 Single Source of Truth로 생성

## SVG Analysis

업로드 시:
- viewBox
- width / height
- aspect ratio
- fill / stroke color
- basic sanitization

을 분석한다.

## Editor

- Left: Page List + ON/OFF
- Center: A4 SVG Preview
- Right: Page/Rule Settings
- 자유 배치 기능 없음
- Clear Space / Minimum Size / Description 등 콘텐츠 데이터만 수정

## Export

V1 초기 구현:
- Current Page SVG
- All SVG ZIP
- Browser print 기반 A4 Landscape PDF 저장

추후 direct PDF export engine과 font embedding을 보강한다.

## Rendering Principle

BrandCreator는 자유 편집기가 아니라 고정 템플릿 기반 자동 조립기다. 입력 데이터가 바뀌면 동일한 layout token과 page template을 사용해 일관된 결과를 생성한다.
