import React, { useState } from 'react';
import { FileText, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ResumeDocument } from '../resumeApi';
import { resolveMediaUrl } from '../../../utils/mediaUrl';

interface AttachedDocumentsPreviewProps {
  documents?: ResumeDocument[];
}

export const AttachedDocumentsPreview: React.FC<AttachedDocumentsPreviewProps> = ({
  documents = [],
}) => {
  const [failedDocs, setFailedDocs] = useState<Record<string, boolean>>({});

  const validDocs = documents.filter((d) => d.includeInDownload);
  if (!validDocs || validDocs.length === 0) return null;

  const handleImageError = (idOrIdx: string, docName: string) => {
    console.error(`Supporting document image failed to load: ${docName}`);
    setFailedDocs((prev) => ({ ...prev, [idOrIdx]: true }));
  };

  return (
    <div className="mt-8 space-y-6 w-full max-w-[800px] mx-auto print:break-before-page">
      <div className="flex items-center gap-2 px-1 text-slate-500">
        <FileText size={16} className="text-orange-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Attached Supporting Documents (Appendix Pages)
        </h3>
        <span className="text-[11px] bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 font-semibold">
          {validDocs.length}
        </span>
      </div>

      {validDocs.map((doc, idx) => {
        const docKey = doc._id || String(idx);
        const resolvedUrl = resolveMediaUrl(doc.fileUrl);
        const isPdf =
          doc.mimeType === 'application/pdf' ||
          resolvedUrl.toLowerCase().endsWith('.pdf') ||
          resolvedUrl.toLowerCase().includes('.pdf?');
        const hasFailed = failedDocs[docKey];

        return (
          <div
            key={docKey}
            className="w-full bg-white text-slate-800 p-6 sm:p-8 shadow-sm border border-slate-200 rounded-sm font-sans break-inside-avoid print:shadow-none print:border-none print:p-0"
          >
            {/* Header bar of appendix page */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-slate-700 pb-3 mb-4">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded mb-1">
                  Appendix Document #{idx + 1} • {doc.documentType?.toUpperCase() || 'DOCUMENT'}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {doc.name}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Included in CV PDF
                </span>

                {resolvedUrl && (
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md transition"
                    title="Open full document in new tab"
                  >
                    <ExternalLink size={12} />
                    <span>Open</span>
                  </a>
                )}
              </div>
            </div>

            {/* Document Body Preview */}
            <div className="flex flex-col items-center justify-center min-h-[350px] bg-slate-50/60 rounded-lg border border-slate-200/80 p-3 overflow-hidden">
              {hasFailed ? (
                <div className="flex flex-col items-center text-center p-6 space-y-2">
                  <AlertCircle size={28} className="text-amber-500" />
                  <p className="text-xs font-semibold text-slate-700">Supporting document could not be loaded.</p>
                  <p className="text-[11px] text-slate-500">Please try uploading the document again in the Document Manager.</p>
                </div>
              ) : isPdf ? (
                <div className="w-full space-y-3">
                  <iframe
                    src={resolvedUrl}
                    title={doc.name}
                    className="w-full h-[520px] rounded border border-slate-300 bg-white"
                  />
                  <div className="text-center">
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-orange-600 hover:underline"
                    >
                      Click here if PDF preview does not load directly
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center">
                  <img
                    src={resolvedUrl}
                    alt={doc.name}
                    className="max-h-[620px] w-auto max-w-full object-contain rounded shadow-xs"
                    loading="lazy"
                    onError={() => handleImageError(docKey, doc.name)}
                  />
                  <span className="text-[10px] text-slate-400 mt-2">
                    High-resolution image attached as appendix page in CV export
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttachedDocumentsPreview;
