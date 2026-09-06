import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchJobById, applyToJob } from "./jobseekerApi/api";
import { Lock, CheckCircle2 } from "lucide-react";
import CoverLetterEditor, { htmlToPlainText } from "./coverLetter/CoverLetterEditor";

interface Job {
  _id: string;
  title: string;
  description: string;
  deadline?: string;
  isApplied?: boolean;
  employer?: { name?: string };
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

  const isExpired = Boolean(job?.deadline && new Date(job.deadline).getTime() < Date.now());
  // `coverLetter` holds the rich editor's HTML — Application.coverLetter is
  // a plain String field (also the more ATS-safe representation to store
  // and to show back to employers, who render it as plain text everywhere
  // it's displayed today), so the plain-text derivation is what's actually
  // required/submitted, not the HTML.
  const coverLetterPlainText = htmlToPlainText(coverLetter);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!jobId || !resumeFile || isExpired || submitting) return;
    if (!coverLetterPlainText.trim()) {
      toast.error("Please write a cover letter before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      await applyToJob({
        jobId,
        howDidYouHear,
        coverLetter: coverLetterPlainText,
        resumeFile,
      });
      // Confirmation shown inline below (status/date/company/job/resume)
      // instead of an alert+immediate redirect, so the jobseeker actually
      // sees what they just submitted.
      localStorage.removeItem(`quickjobs:coverLetterDraft:${jobId}`);
      setSubmitted({ resumeName: resumeFile.name });
    } catch (error: any) {
      console.error("Application error:", error);
      // The backend already rejects a second application with this exact
      // message (jobController.js's applyInJob) — surface it clearly
      // instead of a generic failure, since it's not really an error.
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

  if (!job) return <div>Loading job details...</div>;

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

  // Landing here directly (e.g. a bookmarked/shared link) for a job
  // already applied to — same guard as the "Already Applied" badge on the
  // Job Detail page, backed by the same real applyInJob duplicate check.
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
          {job.employer?.name && <p><span className="text-gray-400">Company:</span> {job.employer.name}</p>}
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

  return (
    <div className="mx-auto mb-10 mt-6 w-full max-w-5xl px-4 sm:mt-10 sm:px-6">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-6 md:p-8">
        <h1 className="mb-4 text-xl font-bold sm:text-2xl">Apply to {job.title}</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">How did you hear about this job?</span>
            <input
              type="text"
              value={howDidYouHear}
              onChange={(e) => setHowDidYouHear(e.target.value)}
              required
              placeholder="e.g. LinkedIn, a friend, this website"
              className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </label>

          <CoverLetterEditor
            jobId={jobId!}
            jobTitle={job.title}
            companyName={job.employer?.name || ""}
            jobDescription={job.description}
            value={coverLetter}
            onChange={setCoverLetter}
          />

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Resume (PDF or DOC) <span className="text-rose-500">*</span>
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              required
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !coverLetterPlainText.trim() || !resumeFile}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplyPage;