import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { Resume } from '../resumeApi';
import { shouldShowPageNumber, formatPageNumberText, pageNumberAlignClass } from '../utils/pageNumberFormat';

interface A4PageContainerProps {
  resume: Resume;
  children: React.ReactNode;
  className?: string;
}

export const A4PageContainer: React.FC<A4PageContainerProps> = ({
  resume,
  children,
  className = '',
}) => {
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const [pageSplits, setPageSplits] = useState<number[][]>([[0]]);
  const [isMeasured, setIsMeasured] = useState(false);

  const pageOption = resume.pageNumbering || 'all';

  // Measure direct block children and partition them cleanly across A4 pages
  useLayoutEffect(() => {
    const container = measureContainerRef.current;
    if (!container) return;

    // Find all top-level document blocks (header and direct sections)
    // We look inside the template wrapper (first child of measure container)
    const templateRoot = container.firstElementChild;
    if (!templateRoot) return;

    // The direct children or top-level semantic sections
    const header = templateRoot.querySelector('header');
    const sectionsContainer = templateRoot.querySelector('.space-y-3\\.5, .space-y-3, .space-y-4, .space-y-2') || templateRoot;
    
    // Collect all atomic blocks: header, and each section
    const blocks: HTMLElement[] = [];
    if (header) {
      blocks.push(header as HTMLElement);
    }

    const sections = Array.from(sectionsContainer.querySelectorAll(':scope > section, :scope > div.break-inside-avoid, :scope > section.break-inside-avoid'));
    if (sections.length > 0) {
      sections.forEach((s) => blocks.push(s as HTMLElement));
    } else {
      // Fallback to all direct child elements except header
      Array.from(templateRoot.children).forEach((child) => {
        if (child !== header) blocks.push(child as HTMLElement);
      });
    }

    if (blocks.length === 0) {
      setPageSplits([[0]]);
      setIsMeasured(true);
      return;
    }

    // A4 page height is 1123px at 794px width (~1:1.414 aspect ratio)
    // Reserve ~55px for footer line and margins
    const USABLE_H_PAGE_1 = 1040;
    const USABLE_H_PAGE_2 = 1010;

    const pages: number[][] = [[]];
    let currentPage = 0;
    let currentHeight = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const h = block.offsetHeight || 0;
      const maxH = currentPage === 0 ? USABLE_H_PAGE_1 : USABLE_H_PAGE_2;

      // If block does not fit on current page and current page already has content:
      // Move block to next page!
      if (currentHeight + h > maxH && currentHeight > 80) {
        currentPage++;
        pages[currentPage] = [i];
        currentHeight = h;
      } else {
        pages[currentPage].push(i);
        currentHeight += h;
      }
    }

    setPageSplits(pages);
    setIsMeasured(true);
  }, [resume]);

  const totalPages = pageSplits.length;

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Hidden off-screen container used strictly to measure natural block heights */}
      <div
        ref={measureContainerRef}
        aria-hidden="true"
        className="absolute top-0 left-[-9999px] w-[794px] pointer-events-none opacity-0 overflow-hidden"
      >
        {children}
      </div>

      {/* Rendered A4 Page Sheets */}
      {!isMeasured || totalPages <= 1 ? (
        // Single page (or before measurement finishes)
        <div
          className="resume-page w-full max-w-[800px] min-h-[1050px] bg-white text-slate-800 font-sans shadow-md border border-slate-200/80 rounded-xs flex flex-col justify-between mb-8 overflow-hidden print:shadow-none print:border-none print:mb-0"
          data-page-index="0"
        >
          {resume.pageNumberPosition === 'header' && shouldShowPageNumber(pageOption, true, true) && (
            <PageNumberBand resume={resume} pageIndex={0} totalPages={totalPages} position="header" />
          )}
          <div className="w-full flex-1">{children}</div>
          {resume.pageNumberPosition !== 'header' && shouldShowPageNumber(pageOption, true, true) && (
            <PageNumberBand resume={resume} pageIndex={0} totalPages={totalPages} position="footer" />
          )}
        </div>
      ) : (
        // Multi-page distribution
        pageSplits.map((blockIndices, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;
          const showNumberOnThisPage = shouldShowPageNumber(pageOption, isFirstPage, isLastPage);
          const isHeaderPosition = resume.pageNumberPosition === 'header';

          return (
            <div
              key={pageIdx}
              className="resume-page w-full max-w-[800px] min-h-[1050px] bg-white text-slate-800 font-sans shadow-md border border-slate-200/80 rounded-xs flex flex-col justify-between mb-8 overflow-hidden print:shadow-none print:border-none print:mb-0"
              data-page-index={pageIdx}
            >
              {isHeaderPosition && (
                showNumberOnThisPage ? (
                  <PageNumberBand resume={resume} pageIndex={pageIdx} totalPages={totalPages} position="header" />
                ) : (
                  <div className="w-full h-4" />
                )
              )}

              <div className="w-full flex-1">
                {/* On Page 1, render full template with unallocated blocks hidden via CSS,
                    or clone nodes into page container */}
                <PaginatedPageRenderer
                  templateNode={measureContainerRef.current}
                  blockIndices={blockIndices}
                  isFirstPage={isFirstPage}
                  resume={resume}
                />
              </div>

              {!isHeaderPosition && (
                showNumberOnThisPage ? (
                  <PageNumberBand resume={resume} pageIndex={pageIdx} totalPages={totalPages} position="footer" />
                ) : (
                  <div className="w-full h-4 mt-auto" />
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// The page-number band itself — used for both 'header' (rendered above the
// content, with a border-b) and 'footer' (below the content, border-t)
// placement. Text/visibility come from the shared pageNumberFormat helpers
// so the live preview and the ATS-safe PDF exporter never disagree with
// each other (see that file's header comment) — and the raster PDF export
// deliberately draws nothing extra of its own, since it screenshots this
// exact DOM node via html2canvas.
const PageNumberBand: React.FC<{
  resume: Resume;
  pageIndex: number;
  totalPages: number;
  position: 'header' | 'footer';
}> = ({ resume, pageIndex, totalPages, position }) => {
  const text = formatPageNumberText(pageIndex, totalPages, resume.pageNumberStyle, resume.pageNumberStart);
  const alignClass = pageNumberAlignClass(resume.pageNumberAlign);
  const edgeClass = position === 'header' ? 'border-b' : 'border-t mt-auto';
  return (
    <div className={`w-full px-6 py-3 ${edgeClass} border-slate-200 flex items-center text-[10px] text-slate-500 font-sans ${alignClass}`}>
      {text}
    </div>
  );
};

// Helper component that clones the measured DOM blocks for a specific page
const PaginatedPageRenderer: React.FC<{
  templateNode: HTMLDivElement | null;
  blockIndices: number[];
  isFirstPage: boolean;
  resume: Resume;
}> = ({ templateNode, blockIndices, isFirstPage }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!templateNode || !mountRef.current) return;
    const templateRoot = templateNode.firstElementChild;
    if (!templateRoot) return;

    // Collect blocks in same order as measured
    const header = templateRoot.querySelector('header');
    const sectionsContainer = templateRoot.querySelector('.space-y-3\\.5, .space-y-3, .space-y-4, .space-y-2') || templateRoot;

    const allBlocks: HTMLElement[] = [];
    if (header) allBlocks.push(header as HTMLElement);

    const sections = Array.from(sectionsContainer.querySelectorAll(':scope > section, :scope > div.break-inside-avoid, :scope > section.break-inside-avoid'));
    if (sections.length > 0) {
      sections.forEach((s) => allBlocks.push(s as HTMLElement));
    } else {
      Array.from(templateRoot.children).forEach((child) => {
        if (child !== header) allBlocks.push(child as HTMLElement);
      });
    }

    // Clear previous children
    mountRef.current.innerHTML = '';

    // Create a container maintaining the template's font and padding
    const pageWrapper = document.createElement('div');
    pageWrapper.className = templateRoot.className;
    pageWrapper.setAttribute('style', (templateRoot as HTMLElement).getAttribute('style') || '');

    // For sections on page 2+, wrap in standard section spacing
    const innerWrapper = document.createElement('div');
    innerWrapper.className = isFirstPage ? '' : 'p-4 sm:p-5 print:p-4 space-y-3.5';

    blockIndices.forEach((idx) => {
      const block = allBlocks[idx];
      if (block) {
        const clone = block.cloneNode(true);
        if (block === header) {
          pageWrapper.appendChild(clone);
        } else {
          innerWrapper.appendChild(clone);
        }
      }
    });

    if (innerWrapper.hasChildNodes()) {
      pageWrapper.appendChild(innerWrapper);
    }

    mountRef.current.appendChild(pageWrapper);
  }, [templateNode, blockIndices, isFirstPage]);

  return <div ref={mountRef} className="w-full" />;
};

export default A4PageContainer;
