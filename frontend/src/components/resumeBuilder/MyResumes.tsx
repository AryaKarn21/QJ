import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Pencil, Trash2, Plus, Loader2, Globe, Copy, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCurrentUser } from '../../utils/currentUser';
import { getMyResumes, deleteResume, cloneResume, ResumeSummary } from './resumeApi';
import { getTemplateById } from './templates/registry';
import { SUPPORTED_COUNTRIES, getCountryConfig, CountryCVConfig } from './config/countryCVConfigs';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const MyResumes: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useCurrentUser();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cloneModalResume, setCloneModalResume] = useState<ResumeSummary | null>(null);
  const [cloning, setCloning] = useState(false);

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

  const handleCloneToCountry = async (country: CountryCVConfig) => {
    if (!cloneModalResume) return;
    setCloning(true);
    try {
      const cloned = await cloneResume(cloneModalResume._id, {
        targetCountryCode: country.countryCode,
        layout: country.defaultTemplateId,
        title: `${cloneModalResume.title} - ${country.countryName} CV`,
      });
      toast.success(`Created ${country.countryName} CV from existing resume!`);
      setCloneModalResume(null);
      navigate(`/resume/${cloned._id}/edit`);
    } catch (err) {
      console.error('Failed to clone resume', err);
      toast.error('Failed to duplicate resume. Please try again.');
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Resumes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every resume you've created — pick one up where you left off, or start a new country-specific CV.
            </p>
          </div>
          <button
            onClick={() => navigate('/resume')}
            className="btn-shine flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm shadow-orange-500/25 sm:w-auto"
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
              className="btn-shine mt-4 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm shadow-orange-500/25"
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
              const country = getCountryConfig(resume.countryCode);

              return (
                <div
                  key={resume._id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {resume.title || 'Untitled Resume'}
                      </p>
                      {country && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-orange-700">
                          <span>{country.flag}</span>
                          <span>{country.countryName} CV</span>
                        </div>
                      )}
                    </div>
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

                  <p className="mt-1.5 truncate text-xs text-slate-500">{template?.name || resume.layout}</p>
                  {resume.targetRole && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">{resume.targetRole}</p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">Updated {formatDate(resume.updatedAt)}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
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
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setCloneModalResume(resume)}
                          title="Create Country-Specific CV from this resume"
                          className="flex items-center justify-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                        >
                          <Globe size={12} /> Country CV
                        </button>
                        <button
                          onClick={() => setConfirmId(resume._id)}
                          aria-label={`Delete ${resume.title || 'Untitled Resume'}`}
                          className="flex items-center justify-center rounded-lg border border-red-100 p-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clone to Country CV Modal */}
        {cloneModalResume && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => !cloning && setCloneModalResume(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Create Country-Specific CV
                    </h3>
                    <p className="text-xs text-slate-500">
                      Clone &apos;{cloneModalResume.title}&apos; into a tailored international format
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !cloning && setCloneModalResume(null)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-600">
                QuickJobs will copy your experience, education, skills, and contact info into the selected country structure so you don't have to enter everything again.
              </p>

              <div className="mt-4 space-y-2.5">
                {SUPPORTED_COUNTRIES.map((country) => (
                  <div
                    key={country.countryCode}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 hover:border-orange-300 hover:bg-orange-50/30 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{country.countryName}</h4>
                        <p className="text-[11px] text-slate-500">{country.styleSubtitle} • {country.badge}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={cloning}
                      onClick={() => handleCloneToCountry(country)}
                      className="btn-shine rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition shadow-xs shadow-orange-500/25 disabled:opacity-60"
                    >
                      {cloning ? 'Cloning…' : 'Clone CV →'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResumes;