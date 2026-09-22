import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  CheckSquare,
  Square,
  Eye,
  Loader2,
  AlertCircle,
  Plus,
  FileCheck,
} from 'lucide-react';
import type { ResumeDocument } from '../resumeApi';
import { uploadResumeDocument, deleteResumeDocument, toggleResumeDocument } from '../resumeApi';

interface DocumentManagerProps {
  resumeId: string;
  documents?: ResumeDocument[];
  onDocumentsChange: (documents: ResumeDocument[]) => void;
}

const DOCUMENT_TYPES: { label: string; value: ResumeDocument['documentType'] }[] = [
  { label: 'Passport', value: 'passport' },
  { label: 'Certificate', value: 'certificate' },
  { label: 'Education Document', value: 'education' },
  { label: 'Experience Document', value: 'experience' },
  { label: 'Training Certificate', value: 'training' },
  { label: 'Other Document', value: 'other' },
];

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  resumeId,
  documents = [],
  onDocumentsChange,
}) => {
  const [selectedType, setSelectedType] = useState<ResumeDocument['documentType']>('passport');
  const [docName, setDocName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<ResumeDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const nameToUse = docName.trim() || file.name.replace(/\.[^/.]+$/, '');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', selectedType);
    formData.append('name', nameToUse);

    setUploading(true);
    setError('');

    try {
      const res = await uploadResumeDocument(resumeId, formData);
      onDocumentsChange(res.documents);
      setDocName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      setError(err?.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const res = await deleteResumeDocument(resumeId, docId);
      onDocumentsChange(res.documents);
      if (previewDoc?._id === docId) setPreviewDoc(null);
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document.');
    }
  };

  const handleToggleInclude = async (doc: ResumeDocument) => {
    const nextVal = !doc.includeInDownload;
    try {
      const res = await toggleResumeDocument(resumeId, doc._id, {
        includeInDownload: nextVal,
      });
      onDocumentsChange(res.documents);
    } catch (err: any) {
      console.error('Failed to update document:', err);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-orange-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            DOCUMENTS (SUPPORTING APPENDIX)
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'} attached
        </span>
      </div>

      <p className="text-[11px] text-slate-500">
        Upload supporting documents (Passport, Certificates, etc.). Documents marked with a checkmark will be appended as high-resolution appendix pages at the end of the downloaded CV.
      </p>

      {/* Upload Box */}
      <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50/20 p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Document Type</label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
              Document Label / Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
              placeholder="e.g. Passport Copy / Food Safety Certificate"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[10.5px] text-slate-400">
            Supported formats: PDF, JPG, PNG, WebP (Max 10MB)
          </span>

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition shadow-2xs"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            <span>{uploading ? 'Uploading…' : 'Choose File & Upload'}</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-md">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Attached Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Attached Documents (Check to include in PDF download):
          </h4>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="flex items-center justify-between p-2.5 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleInclude(doc)}
                    className="text-orange-600 hover:text-orange-700 shrink-0"
                    title={doc.includeInDownload ? 'Included in PDF' : 'Excluded from PDF'}
                  >
                    {doc.includeInDownload ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} className="text-slate-400" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {doc.name}
                    </p>
                    <p className="text-[10.5px] text-slate-400 uppercase">
                      {doc.documentType} •{' '}
                      {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Attached'}
                      {doc.includeInDownload ? (
                        <span className="text-emerald-600 font-semibold ml-1.5">
                          ✓ In Download
                        </span>
                      ) : (
                        <span className="text-slate-400 ml-1.5">Excluded</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                    title="Preview Document"
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc._id)}
                    className="rounded-md p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove Document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Modal Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="relative max-h-[90vh] w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDoc.name}</h3>
                <span className="text-[11px] text-slate-500 uppercase">{previewDoc.documentType}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50 rounded-xl my-3">
              {previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.name}
                  className="h-[60vh] w-full rounded-lg border border-slate-200"
                />
              ) : (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.name}
                  className="max-h-[60vh] object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
