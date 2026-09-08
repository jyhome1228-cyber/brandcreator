export interface SvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LogoAsset {
  fileName: string;
  raw: string;
  inner: string;
  viewBox: SvgViewBox;
  aspectRatio: number;
  colors: string[];
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
