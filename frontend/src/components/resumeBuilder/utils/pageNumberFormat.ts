// Single source of truth for "how does a page number look" — shared by the
// live preview (A4PageContainer.tsx, rendered into the DOM) and the
// ATS-safe PDF exporter (pdfGenerator.ts's generateAtsSafePDF, which draws
// directly with jsPDF and has no DOM to read from). The raster PDF export
// (generatePDF) needs neither of these — it screenshots the already-correct
// DOM via html2canvas, so drawing a second number on top of that screenshot
// would just duplicate it (which is exactly the bug this file's addition
// fixes: previously each of these three places computed page-number text
// and visibility independently and had drifted out of sync).
import type { Resume } from '../resumeApi';

export type PageNumberStyle = NonNullable<Resume['pageNumberStyle']>;
export type PageNumberPosition = NonNullable<Resume['pageNumberPosition']>;
export type PageNumberAlign = NonNullable<Resume['pageNumberAlign']>;

/** Whether page numbers should render on a given page at all, per the 'no'|'all'|'first'|'last' setting. */
export function shouldShowPageNumber(
  pageOption: Resume['pageNumbering'],
  isFirstPage: boolean,
  isLastPage: boolean
): boolean {
  const option = pageOption || 'all';
  if (option === 'no' || option === 'none') return false;
  if (option === 'first') return isFirstPage;
  if (option === 'last') return isLastPage;
  return true; // 'all'
}

/**
 * Renders the page-number text for a given (0-based) page index, honoring
 * the chosen format and the "start at" offset — mirrors Word's Format Page
 * Numbers dialog: the displayed number shifts by `start`, but the "of
 * Total" count in 'full' style always reflects the real page count, not
 * the shifted number.
 */
export function formatPageNumberText(
  pageIndex: number,
  totalPages: number,
  style: PageNumberStyle | undefined,
  start: number | undefined
): string {
  const displayNumber = pageIndex + (start && start > 0 ? start : 1);
  switch (style) {
    case 'plain':
      return `${displayNumber}`;
    case 'prefixed':
      return `Page ${displayNumber}`;
    case 'full':
    default:
      return `Page ${displayNumber} of ${totalPages}`;
  }
}

/** Tailwind justify-* class for a given alignment — used by A4PageContainer's flex footer/header band. */
export function pageNumberAlignClass(align: PageNumberAlign | undefined): string {
  switch (align) {
    case 'left':
      return 'justify-start';
    case 'center':
      return 'justify-center';
    case 'right':
    default:
      return 'justify-end';
  }
}
