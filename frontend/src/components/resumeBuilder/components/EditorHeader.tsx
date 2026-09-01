/**
 * EditorHeader.tsx — REPLACES existing
 * Path: frontend/src/components/resumeBuilder/components/EditorHeader.tsx
 *
 * Fixes vs original:
 * - Fully responsive — stacks cleanly on 360px mobile
 * - Uses correct `bg-primary` (Tailwind token = #A75233)
 * - Sticky top bar so header never scrolls away
 * - Edit hint bar replaces full-page blue banner (much less noisy)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, EyeOff } from 'lucide-react';

interface EditorHeaderProps {
  templateName: string;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  onDownloadPDF: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  templateName,
  isPreviewMode,
  onTogglePreview,
  onDownloadPDF,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">

        {/* Main toolbar row */}
        <div className="flex items-center gap-3">

          {/* Back + title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => navigate('/resume')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              aria-label="Back to templates"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Templates</span>
            </button>

            <div className="h-5 w-px bg-gray-200 hidden sm:block" />

            <h1 className="text-sm sm:text-base font-semibold text-gray-800 truncate">
              {templateName}
              <span className="text-gray-400 font-normal hidden sm:inline"> Editor</span>
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onTogglePreview}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                isPreviewMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isPreviewMode ? (
                <><EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>Edit</span></>
              ) : (
                <><Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">Preview</span><span className="sm:hidden">View</span></>
              )}
            </button>

            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 bg-primary hover:opacity-90 active:opacity-75 text-white px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>

        {/* Slim edit hint — replaces the bulky full-page blue banner */}
        {!isPreviewMode && (
          <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-2.5 py-1">
            ✏️ Click any text field to edit · Changes save automatically
          </p>
        )}
      </div>
    </div>
  );
};

export default EditorHeader;