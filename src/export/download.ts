import JSZip from 'jszip';
import type { GuidelinePage } from '../types/guideline';

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'brand';
}

export function downloadSvg(page: GuidelinePage, brandName: string): void {
  downloadBlob(new Blob([page.svg], { type: 'image/svg+xml;charset=utf-8' }), `${slugify(brandName)}-${page.id}.svg`);
}

export async function downloadAllSvg(pages: GuidelinePage[], brandName: string): Promise<void> {
  const zip = new JSZip();
  pages.forEach((page, index) => {
    zip.file(`${String(index + 1).padStart(2, '0')}_${page.id}.svg`, page.svg);
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${slugify(brandName)}-guideline-svg.zip`);
}
