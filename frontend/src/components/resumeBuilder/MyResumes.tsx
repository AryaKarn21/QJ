import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCurrentUser } from '../../utils/currentUser';
import { getMyResumes, deleteResume, ResumeSummary } from './resumeApi';
import { getTemplateById } from './templates/registry';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const MyResumes: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useCurrentUser();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Please log in to see your resumes.');
      navigate('/login', { state: { from: { pathname: '/resume/history' } } });
      return;
    }
    getMyResumes()
      .then(setResumes)
      .catch((err) => {
        console.error('Failed to load resumes', err);
        toast.error('Could not load your resumes. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      toast.success('Resume deleted.');
    } catch (err) {
      console.error('Failed to delete resume', err);
      toast.error('Could not delete this resume. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Resumes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every resume you've created — pick one up where you left off, or start a new one.
            </p>
          </div>
          <button
            onClick={() => navigate('/resume')}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 sm:w-auto"
          >
            <Plus size={15} /> New Resume
          </button>
        </div>

        {loading && (
          <div className="mt-16 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        )}

        {!loading && resumes.length === 0 && (
          <div className="mt-16 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={32} />
            <p className="text-sm text-slate-500">You haven't created any resumes yet.</p>
            <button
              onClick={() => navigate('/resume')}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Choose a Template
            </button>
          </div>
        )}

        {/* Cards, not rows — a fixed-row layout either overflows the
            viewport or crushes the title/actions unreadable at 360px; a
            grid that collapses to one column per card fits comfortably and
            scales up to 2-3 per row on larger screens. */}
        {!loading && resumes.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => {
              const template = getTemplateById(resume.layout);
              return (
                <div
                  key={resume._id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                      {resume.title || 'Untitled Resume'}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        resume.status === 'final'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {resume.status === 'final' ? 'Final' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{template?.name || resume.layout}</p>
                  {resume.targetRole && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">{resume.targetRole}</p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">Updated {formatDate(resume.updatedAt)}</p>

                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                    {confirmId === resume._id ? (
                      <>
                        <button
                          onClick={() => handleDelete(resume._id)}
                          disabled={deletingId === resume._id}
                          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingId === resume._id ? 'Deleting…' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/resume/${resume._id}/edit`)}
                          aria-label={`Edit ${resume.title || 'Untitled Resume'}`}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => setConfirmId(resume._id)}
                          aria-label={`Delete ${resume.title || 'Untitled Resume'}`}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResumes;