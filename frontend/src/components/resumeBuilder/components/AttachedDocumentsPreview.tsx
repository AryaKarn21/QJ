import React from 'react';
import { FileText, Image as ImageIcon, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ResumeDocument } from '../resumeApi';

interface AttachedDocumentsPreviewProps {
  documents?: ResumeDocument[];
}

export const AttachedDocumentsPreview: React.FC<AttachedDocumentsPreviewProps> = ({
  documents = [],
}) => {
  if (!documents || documents.length === 0) return null;

  return (
    <div className="mt-8 space-y-6 w-full max-w-[800px] mx-auto print:break-before-page">
      <div className="flex items-center gap-2 px-1 text-slate-500">
        <FileText size={16} className="text-orange-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Attached Supporting Documents (Appendix Pages)
        </h3>
        <span className="text-[11px] bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 font-semibold">
          {documents.length}
        </span>
      </div>

      {documents.map((doc, idx) => {
        const isPdf =
          doc.mimeType === 'application/pdf' ||
          doc.fileUrl.toLowerCase().endsWith('.pdf') ||
          doc.fileUrl.toLowerCase().includes('.pdf?');

        return (
          <div
            key={doc._id || idx}
            className="w-full bg-white text-slate-800 p-6 sm:p-8 shadow-sm border border-slate-200 rounded-sm font-sans break-inside-avoid print:shadow-none print:border-none print:p-0"
          >
            {/* Header bar of appendix page */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-slate-600 pb-3 mb-4">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded mb-1">
                  Appendix Document #{idx + 1} • {doc.documentType}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {doc.name}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {doc.includeInDownload ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Included in CV PDF
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    Excluded from download
                  </span>
                )}

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md transition"
                  title="Open full document in new tab"
                >
                  <ExternalLink size={12} />
                  <span>Open</span>
                </a>
              </div>
            </div>

            {/* Document Body Preview */}
            <div className="flex flex-col items-center justify-center min-h-[350px] bg-slate-50/60 rounded-lg border border-slate-200/80 p-3 overflow-hidden">
              {isPdf ? (
                <div className="w-full space-y-3">
                  <iframe
                    src={doc.fileUrl}
                    title={doc.name}
                    className="w-full h-[520px] rounded border border-slate-300 bg-white"
                  />
                  <div className="text-center">
                    <a
                      href={doc.fileUrl}
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
                    src={doc.fileUrl}
                    alt={doc.name}
                    className="max-h-[620px] w-auto max-w-full object-contain rounded shadow-xs"
                    loading="lazy"
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
