import React from 'react';
import { FileText, ExternalLink, Download, Paperclip } from 'lucide-react';
import type { ResumeDocument } from '../resumeApi';
import { resolveMediaUrl } from '../../../utils/mediaUrl';

interface AttachedDocumentsPreviewProps {
  documents?: ResumeDocument[];
  resumeId?: string;
  onDownloadCV?: () => void;
}

export const AttachedDocumentsPreview: React.FC<AttachedDocumentsPreviewProps> = ({
  documents = [],
  resumeId,
  onDownloadCV,
}) => {
  const validDocs = documents.filter((d) => d.includeInDownload);
  if (!validDocs || validDocs.length === 0) return null;

  const getDocumentOpenUrl = (doc: ResumeDocument) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (resumeId && doc._id) {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com').replace(/\/+$/, '');
      const qs = token ? `?token=${encodeURIComponent(token)}` : '';
      return `${apiBase}/api/resumes/${resumeId}/documents/${doc._id}/file${qs}`;
    }
    return resolveMediaUrl(doc.fileUrl);
  };

  return (
    <div className="mt-8 w-full max-w-[800px] mx-auto print:hidden">
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Paperclip size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Uploaded Supporting Documents
              </h3>
              <p className="text-[11px] text-slate-500">
                {validDocs.length} {validDocs.length === 1 ? 'document' : 'documents'} attached to your resume profile
              </p>
            </div>
          </div>

          {onDownloadCV && (
            <button
              onClick={onDownloadCV}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition"
            >
              <Download size={13} />
              <span>Download CV</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {validDocs.map((doc, idx) => {
            const openUrl = getDocumentOpenUrl(doc);

            return (
              <div
                key={doc._id || idx}
                className="py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="uppercase font-medium tracking-wider bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {doc.documentType || 'DOCUMENT'}
                      </span>
                      {doc.fileSize ? (
                        <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {openUrl && (
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md transition"
                    >
                      <ExternalLink size={12} />
                      <span>Open in tab</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttachedDocumentsPreview;
