import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchJobById, applyToJob } from "./jobseekerApi/api";
import { Lock, CheckCircle2 } from "lucide-react";

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!jobId || !resumeFile || isExpired || submitting) return;

    try {
      setSubmitting(true);
      await applyToJob({
        jobId,
        howDidYouHear,
        coverLetter,
        resumeFile,
      });
      // Confirmation shown inline below (status/date/company/job/resume)
      // instead of an alert+immediate redirect, so the jobseeker actually
      // sees what they just submitted.
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
    <div className="max-w-xl mx-auto mt-10 mb-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Apply to {job.title}</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <label className="block mb-2">
          How did you hear about this job?
          <input
            type="text"
            value={howDidYouHear}
            onChange={(e) => setHowDidYouHear(e.target.value)}
            required
            className="w-full border rounded p-2 mt-1"
          />
        </label>

        <label className="block mb-2 mt-4">
          Cover Letter
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            required
            className="w-full border rounded p-2 mt-1"
            rows={8}
          />
        </label>

        <label className="block mb-4 mt-4">
          Resume (PDF or DOC)
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            required
            className="block mt-1"
          />
        </label>

        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Submit Application
        </button>
      </form>
    </div>
  );
};

export default ApplyPage;