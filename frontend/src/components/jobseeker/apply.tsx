import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchJobById, applyToJob } from "./jobseekerApi/api";
import {
  Lock,
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  Plus,
  Loader2,
  Calendar,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import CoverLetterEditor, { htmlToPlainText } from "./coverLetter/CoverLetterEditor";
import { SkeletonText, SkeletonParagraph } from "../ui/Skeleton";
import {
  getMyResumes,
  getResumeById,
  type ResumeSummary,
  type Resume,
} from "../resumeBuilder/resumeApi";
import { generateResumePdfBlob } from "../resumeBuilder/utils/pdfGenerator";
import { TemplateRenderer } from "../resumeBuilder/templates/TemplateRenderer";

interface Job {
  _id: string;
  title: string;
  description: string;
  deadline?: string;
  isApplied?: boolean;
  employer?: { name?: string };
  // Per-job display identity (backend/models/Job.js) — falls back to the
  // populated `employer` above, and is the only display name left once
  // `employer` is null (account since deleted).
  companyOverride?: { name?: string };
}

const ApplyPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [howDidYouHear, setHowDidYouHear] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState<{ resumeName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resume Builder CV selection state
  const [resumeMode, setResumeMode] = useState<'builder' | 'upload'>('builder');
  const [savedResumes, setSavedResumes] = useState<ResumeSummary[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return;

      try {
        const data = await fetchJobById(jobId);
        setJob(data);
      } catch (err) {
        console.error("Failed to fetch job", err);
      }
    };
    loadJob();
  }, [jobId]);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        setLoadingResumes(true);
        const list = await getMyResumes();
        setSavedResumes(list || []);
        if (list && list.length > 0) {
          setSelectedResumeId(list[0]._id);
          setResumeMode('builder');
        } else {
          setResumeMode('upload');
        }
      } catch (err) {
        console.warn("Could not fetch saved resumes, defaulting to upload mode:", err);
        setResumeMode('upload');
      } finally {
        setLoadingResumes(false);
      }
    };
    loadResumes();
  }, []);

  const handleOpenPreview = async (resumeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoadingPreviewId(resumeId);
      const full = await getResumeById(resumeId);
      setPreviewResume(full);
    } catch (err) {
      console.error("Failed to load resume preview:", err);
      toast.error("Could not load resume preview.");
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const isExpired = Boolean(job?.deadline && new Date(job.deadline).getTime() < Date.now());
  const coverLetterPlainText = htmlToPlainText(coverLetter);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!jobId || isExpired || submitting) return;

    if (!coverLetterPlainText.trim()) {
      toast.error("Please write a cover letter before submitting.");
      return;
    }

    if (resumeMode === 'builder') {
      if (!selectedResumeId) {
        toast.error("Please select a resume or switch to file upload.");
        return;
      }
    } else {
      if (!resumeFile) {
        toast.error("Please select a resume file to upload.");
        return;
      }
    }

    try {
      setSubmitting(true);

      let finalFile: File | null = resumeFile;
      let resumeDisplayName = resumeFile?.name || "Uploaded Resume";

      if (resumeMode === 'builder' && selectedResumeId) {
        // Fetch full resume document to generate authoritative PDF with appendix
        const fullResume = await getResumeById(selectedResumeId);
        resumeDisplayName = fullResume.title || "Resume Builder CV";
        const pdfBlob = await generateResumePdfBlob(fullResume);
        const cleanName = `${(fullResume.title || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        finalFile = new File([pdfBlob], cleanName, { type: 'application/pdf' });
      }

      await applyToJob({
        jobId,
        howDidYouHear,
        coverLetter: coverLetterPlainText,
        resumeFile: finalFile,
        resumeId: resumeMode === 'builder' ? selectedResumeId || undefined : undefined,
      });

      localStorage.removeItem(`quickjobs:coverLetterDraft:${jobId}`);
      setSubmitted({ resumeName: resumeDisplayName });
    } catch (error: any) {
      console.error("Application error:", error);
      const message = error?.response?.data?.message || error.message || "Failed to submit application.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    }
  };

  if (!job) return (
    <div className="mx-auto mb-10 mt-6 w-full max-w-5xl px-4 sm:mt-10 sm:px-6" aria-busy="true" aria-label="Loading job details">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-6 md:p-8 space-y-5">
        <SkeletonText width="w-2/3" height="h-7" />
        <SkeletonParagraph lines={5} />
      </div>
    </div>
  );

  if (isExpired) {
    return (
      <div className="max-w-xl mx-auto mt-10 mb-10 p-8 bg-white shadow rounded text-center">
        <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={24} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Applications Closed</h1>
        <p className="text-gray-500 text-sm mb-6">
          The application deadline for "{job.title}" has passed. This job is no longer accepting applications.
        </p>
        <button
          onClick={() => navigate("/jobs")}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
        >
          Browse Other Jobs
        </button>
      </div>
    );
  }

  if (job.isApplied && !submitted) {
    return (
      <div className="max-w-xl mx-auto mt-10 mb-10 p-8 bg-white shadow rounded text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Already Applied</h1>
        <p className="text-gray-500 text-sm mb-6">
          You've already submitted an application for "{job.title}".
        </p>
        <button
          onClick={() => navigate("/user/applications")}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
        >
          View My Applications
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-10 mb-10 p-8 bg-white shadow rounded text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={24} />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Application Submitted</h1>
        <p className="text-gray-500 text-sm mb-6">Here's what was sent:</p>
        <div className="text-left text-sm text-gray-600 space-y-1.5 bg-gray-50 rounded-lg p-4 mb-6">
          <p><span className="text-gray-400">Job:</span> {job.title}</p>
          {(job.companyOverride?.name?.trim() || job.employer?.name?.trim()) && (
            <p><span className="text-gray-400">Company:</span> {job.companyOverride?.name?.trim() || job.employer?.name?.trim()}</p>
          )}
          <p><span className="text-gray-400">Applied on:</span> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><span className="text-gray-400">Resume used:</span> {submitted.resumeName}</p>
          <p><span className="text-gray-400">Status:</span> Pending review</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate("/user/applications")}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
          >
            View My Applications
          </button>
          <button
            onClick={() => navigate("/jobs")}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
          >
            Browse More Jobs
          </button>
        </div>
      </div>
    );
  }

  const canSubmit =
    !submitting &&
    Boolean(coverLetterPlainText.trim()) &&
    ((resumeMode === 'builder' && Boolean(selectedResumeId)) ||
      (resumeMode === 'upload' && Boolean(resumeFile)));

  return (
    <div className="mx-auto mb-10 mt-6 w-full max-w-5xl px-4 sm:mt-10 sm:px-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-6 md:p-8">
        <h1 className="mb-4 text-xl font-bold sm:text-2xl">Apply to {job.title}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">How did you hear about this job?</span>
            <input
              type="text"
              value={howDidYouHear}
              onChange={(e) => setHowDidYouHear(e.target.value)}
              required
              placeholder="e.g. LinkedIn, a friend, this website"
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </label>

          <CoverLetterEditor
            jobId={jobId!}
            jobTitle={job.title}
            companyName={job.companyOverride?.name?.trim() || job.employer?.name?.trim() || ""}
            jobDescription={job.description}
            value={coverLetter}
            onChange={setCoverLetter}
          />

          {/* Resume Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Resume <span className="text-rose-500">*</span>
              </span>
              <span className="text-xs text-slate-400">
                Attach your CV for the employer to review
              </span>
            </div>

            {/* Toggle Modes: Saved Resume Builder CV vs File Upload */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl max-w-md">
              <button
                type="button"
                onClick={() => setResumeMode('builder')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  resumeMode === 'builder'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={14} />
                <span>Resume Builder CV</span>
              </button>
              <button
                type="button"
                onClick={() => setResumeMode('upload')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  resumeMode === 'upload'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload size={14} />
                <span>Upload PDF File</span>
              </button>
            </div>

            {/* Resume Builder CV Options */}
            {resumeMode === 'builder' && (
              <div className="space-y-3 pt-1">
                {loadingResumes ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 size={16} className="animate-spin text-orange-500" />
                    <span>Loading your saved resumes…</span>
                  </div>
                ) : savedResumes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5 text-center space-y-2.5">
                    <p className="text-xs font-medium text-slate-700">
                      You haven&apos;t created any resumes in the Resume Builder yet.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Create an ATS-friendly, professional CV or upload a PDF file directly.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/resume-builder')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition shadow-2xs"
                    >
                      <Plus size={14} />
                      <span>Create Resume in Builder</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedResumes.map((r) => {
                      const isSelected = selectedResumeId === r._id;
                      const formattedDate = r.updatedAt
                        ? new Date(r.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Recently';

                      return (
                        <div
                          key={r._id}
                          onClick={() => setSelectedResumeId(r._id)}
                          className={`group relative rounded-xl border p-3.5 text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-400 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                                    isSelected
                                      ? 'border-orange-500 bg-orange-500 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check size={10} strokeWidth={3} />}
                                </div>
                                <h3 className="text-xs font-bold text-slate-900 truncate">
                                  {r.title || 'Untitled Resume'}
                                </h3>
                              </div>
                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                {r.layout || 'Modern'}
                              </span>
                            </div>

                            {r.targetRole && (
                              <p className="text-[11px] text-slate-600 truncate pl-6">
                                {r.targetRole}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 pl-6">
                            <div className="flex items-center gap-1 text-[10.5px] text-slate-400">
                              <Calendar size={11} />
                              <span>Updated {formattedDate}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleOpenPreview(r._id, e)}
                              disabled={loadingPreviewId === r._id}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-orange-600 transition"
                              title="Preview this resume"
                            >
                              {loadingPreviewId === r._id ? (
                                <Loader2 size={12} className="animate-spin text-orange-500" />
                              ) : (
                                <Eye size={12} />
                              )}
                              <span>Preview</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* File Upload Mode */}
            {resumeMode === 'upload' && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 space-y-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Accepted formats: PDF only (Max 2MB). Make sure your resume is up to date.
                </p>
                {resumeFile && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span className="truncate">Selected: {resumeFile.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto shadow-2xs flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting Application…</span>
              </>
            ) : (
              <span>Submit Application</span>
            )}
          </button>
        </form>
      </div>

      {/* Resume Preview Modal */}
      {previewResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="relative max-h-[90vh] w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {previewResume.title || 'Resume Preview'}
                  </h3>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                    Template: {previewResume.layout}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResumeId(previewResume._id);
                    setResumeMode('builder');
                    setPreviewResume(null);
                    toast.success("Resume selected for application.");
                  }}
                  className="rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition shadow-2xs"
                >
                  Select This Resume
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewResume(null)}
                  className="rounded-full bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 transition"
                  title="Close preview"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-4 sm:p-6 flex justify-center">
              <div className="w-full max-w-[720px] bg-white shadow-lg rounded-sm overflow-hidden">
                <TemplateRenderer resume={previewResume} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-white">
              <span className="text-xs text-slate-500">
                Supporting documents marked for inclusion will be appended upon final submission.
              </span>
              <button
                type="button"
                onClick={() => setPreviewResume(null)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplyPage;