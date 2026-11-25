import JSZip from 'jszip';
import type { GuidelinePage } from '../types/guideline';

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Keep the URL alive long enough for browsers to start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'brand';
}

export function validateExportPage(page: GuidelinePage): void {
  if (!page.svg?.trim()) throw new Error('출력할 SVG 데이터가 없습니다.');
  const doc = new DOMParser().parseFromString(page.svg, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') {
    throw new Error('SVG 형식이 올바르지 않습니다.');
  }
  const values = (doc.documentElement.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) {
    throw new Error('SVG 출력 크기가 올바르지 않습니다.');
  }
}

export function downloadSvg(page: GuidelinePage, brandName: string): void {
  validateExportPage(page);
  downloadBlob(new Blob([page.svg], { type: 'image/svg+xml;charset=utf-8' }), `${slugify(brandName)}-${page.id}.svg`);
}

export async function downloadAllSvg(pages: GuidelinePage[], brandName: string): Promise<void> {
  if (!pages.length) throw new Error('출력할 페이지를 선택해 주세요.');
  pages.forEach(validateExportPage);
  const zip = new JSZip();
  pages.forEach((page, index) => {
    zip.file(`${String(index + 1).padStart(2, '0')}_${page.id}.svg`, page.svg);
  });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
  downloadBlob(blob, `${slugify(brandName)}-guideline-svg.zip`);
}
