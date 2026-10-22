export interface SvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LogoOrientation = 'horizontal' | 'vertical' | 'compact' | 'balanced';
export type LogoComplexity = 'low' | 'medium' | 'high' | 'very-high';
export type LogoClassification = 'wordmark' | 'symbol' | 'combination' | 'emblem' | 'unknown';

export interface LogoColorAnalysis {
  hex: string;
  usageRatio: number;
  occurrences: number;
}

export interface LogoAnalysis {
  geometry: {
    width: number;
    height: number;
    aspectRatio: number;
    visualAspectRatio: number;
    orientation: LogoOrientation;
    visualBounds: SvgViewBox;
    canvasOccupancy: number;
  };
  structure: {
    elementCount: number;
    pathCount: number;
    groupCount: number;
    commandCount: number;
    smallDetailRatio: number;
    complexityScore: number;
    complexity: LogoComplexity;
  };
  color: {
    colors: LogoColorAnalysis[];
    dominant: string | null;
    colorCount: number;
  };
  classification: {
    type: LogoClassification;
    confidence: number;
  };
  recommendation: {
    xBasis: 'logo-height';
    clearSpace: number;
    minimumPrintMm: number;
    minimumDigitalPx: number;
    rationale: string[];
  };
}

export interface LogoAsset {
  fileName: string;
  raw: string;
  inner: string;
  viewBox: SvgViewBox;
  aspectRatio: number;
  colors: string[];
  analysis: LogoAnalysis;
}

export interface BrandProject {
  name: string;
  englishName: string;
  description: string;
  slogan: string;
  year: string;
  logo: LogoAsset | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  typography: {
    title: string;
    body: string;
  };
  rules: {
    clearSpace: number;
    minimumPrintMm: number;
    minimumDigitalPx: number;
  };
}

export interface GuidelinePage {
  id: string;
  section: 'intro' | 'logo' | 'color' | 'typography' | 'end';
  title: string;
  subtitle: string;
  svg: string;
}
