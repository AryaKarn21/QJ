import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllApplicantsForEmployerJobs,
  getEmployerJobs,
  updateApplicationStatus,
  type EmployerApplication,
} from "../employerApi/api";
import {
  Search, ChevronLeft, ChevronRight, FileText, Calendar, User, Mail, Briefcase,
  X, Download, Eye, ExternalLink, GraduationCap, Sparkles, Filter, RotateCcw,
  MessageSquare, Video, Phone, Building2, Clock, CheckCircle2, Link2, MapPin,
  Table, ArrowLeft, AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { resolveMediaUrl, resolveResumeUrl, isUnrecoverableResumePath, getAuthorizedApplicationResumeUrl } from "../../../utils/mediaUrl";
import { downloadFile } from "../../../utils/downloadFile";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { openConversationWith } from "../../../api/messageApi";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Pending:              { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400" },
  Reviewed:             { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400" },
  "Interview Scheduled":{ bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
  Accepted:             { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-400" },
  Rejected:             { bg: "bg-red-50",     text: "text-red-600",    dot: "bg-red-400" },
};

const STATUS_OPTIONS = ["Pending", "Reviewed", "Interview Scheduled", "Accepted", "Rejected"];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const AVATAR_SIZE_CLASSES: Record<number, string> = {
  8: "h-8 w-8",
  10: "h-10 w-10",
  12: "h-12 w-12",
  14: "h-14 w-14",
};

const Avatar = ({ name, photo, size = 8 }: { name?: string; photo?: string; size?: 8 | 10 | 12 | 14 }) => (
  <div className={`${AVATAR_SIZE_CLASSES[size]} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
    {photo ? (
      <img src={resolveMediaUrl(photo)} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className={`${size >= 12 ? 'text-base font-bold' : 'text-xs font-bold'} text-primary`}>
        {(name || "?")[0].toUpperCase()}
      </span>
    )}
  </div>
);

function formatCoverLetter(rawText?: string | null) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return { subject: "", paragraphs: [] };
  }

  let subject = "";
  let body = rawText.trim();

  // Extract Subject: line if present at start
  const subjectMatch = body.match(/^Subject:\s*([^\n\r]+?)(Dear\b|\r|\n|$)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    body = body.slice(subjectMatch[0].length - (subjectMatch[2] ? subjectMatch[2].length : 0)).trim();
  }

  let paragraphs: string[] = [];
  if (body.includes("\n")) {
    paragraphs = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  } else {
    // Intelligent boundary split for unformatted raw single-line text
    const normalized = body
      .replace(/(Dear\s+[^,]+,)/gi, "\n\n$1\n\n")
      .replace(/(When\s+I\s+saw)/gi, "\n\n$1")
      .replace(/(\[[^\]]+\])/g, "\n\n$1\n\n")
      .replace(/(Thank\s+you\s+for\s+considering)/gi, "\n\n$1\n\n")
      .replace(/(Best\s+regards,?)/gi, "\n\n$1\n");
    paragraphs = normalized.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  }

  return { subject, paragraphs };
}

const resumeFilename = (name?: string) =>
  `${(name || "applicant").trim().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "applicant"}-resume.pdf`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const Applicants = () => {
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<EmployerApplication | null>(null);
  const [selectedTab, setSelectedTab] = useState<'resume' | 'coverLetter' | 'profile' | 'interview'>('resume');
  const [downloadingResume, setDownloadingResume] = useState(false);

  const [interviewModalFor, setInterviewModalFor] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState("Video Call");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (selected) {
      setSelectedTab(selected.resume ? 'resume' : 'coverLetter');
    }
  }, [selected?.applicationId]);

  const setQuickDate = (offsetDays: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setInterviewDate(formatted);
  };

  const handleMessageCandidate = async (candidateUserId?: string) => {
    if (!candidateUserId) {
      toast.info("Candidate profile is not available for direct messaging.");
      return;
    }
    try {
      const conv = await openConversationWith(candidateUserId);
      navigate(`/messages/${conv._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not open conversation with candidate.");
    }
  };

  const activeFilterCount = [statusFilter, jobFilter, dateFrom, dateTo].filter(Boolean).length;

  useEffect(() => {
    getEmployerJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, jobFilter, dateFrom, dateTo]);

  const fetchIdRef = useRef(0);
  const fetchApplicants = useCallback(async (opts: { silent?: boolean } = {}) => {
    const fetchId = ++fetchIdRef.current;
    if (!opts.silent) setLoading(true);
    setError(false);
    try {
      const res = await getAllApplicantsForEmployerJobs({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        jobId: jobFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (fetchId !== fetchIdRef.current) return;
      setApplications(res.applications);
      setTotalPages(res.totalPages || 1);
      setTotalApplications(res.totalApplications || 0);
      setStatusCounts(res.statusCounts || {});
    } catch (err) {
      console.error("Error fetching applicants:", err);
      if (fetchId === fetchIdRef.current) setError(true);
    } finally {
      if (fetchId === fetchIdRef.current && !opts.silent) setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, jobFilter, dateFrom, dateTo]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);
  useAutoRefresh(() => fetchApplicants(), 30000);

  const clearFilters = () => {
    setStatusFilter("");
    setJobFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const applyStatusLocally = (applicationId: string, newStatus: string) => {
    setApplications((prev) => prev.map((a) => (a.applicationId === applicationId ? { ...a, status: newStatus as EmployerApplication["status"] } : a)));
    setSelected((prev) => (prev && prev.applicationId === applicationId ? { ...prev, status: newStatus as EmployerApplication["status"] } : prev));
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    if (newStatus === "Interview Scheduled") {
      setInterviewModalFor(applicationId);
      return;
    }
    try {
      const res = await updateApplicationStatus(applicationId, newStatus);
      applyStatusLocally(applicationId, newStatus);
      if (res?.emailSent === false) {
        toast.warn(`Status updated to "${newStatus}", but the notification email couldn't be sent.`);
      } else if (res?.emailSent === true) {
        toast.success(`Status updated to "${newStatus}". Candidate notified by email.`);
      } else {
        toast.success(`Status updated to "${newStatus}".`);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status.");
    }
  };

  const handleScheduleInterview = async () => {
    if (!interviewModalFor) return;
    if (!interviewDate) {
      toast.warn("Please pick an interview date and time.");
      return;
    }
    setSchedulingLoading(true);
    try {
      const res = await updateApplicationStatus(interviewModalFor, "Interview Scheduled", {
        scheduledAt: new Date(interviewDate).toISOString(),
        mode: interviewMode,
        meetingLink: interviewLink,
        location: interviewLocation,
        notes: interviewNotes,
      });
      applyStatusLocally(interviewModalFor, "Interview Scheduled");
      if (res?.emailSent === false) {
        toast.warn("Interview scheduled, but we couldn't send the confirmation email — please follow up with the candidate directly.");
      } else {
        toast.success("Interview scheduled — the candidate has been emailed the details.");
      }
      setInterviewModalFor(null);
      setInterviewDate("");
      setInterviewMode("Video Call");
      setInterviewLink("");
      setInterviewLocation("");
      setInterviewNotes("");
    } catch (err) {
      console.error("Failed to schedule interview:", err);
      toast.error("Failed to schedule interview.");
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleDownloadResume = async (applicant: EmployerApplication) => {
    if (!applicant.resume) return;
    // Applications submitted before the resume-upload fix (see
    // utils/mediaUrl.ts) stored the server's own filesystem path instead of
    // a fetchable URL — there's no file to recover, not a transient
    // network/CORS failure, so give a distinct, honest message instead of
    // attempting a fetch that can only ever fail.
    if (isUnrecoverableResumePath(applicant.resume)) {
      toast.error("Resume unavailable — please ask the applicant to upload again");
      return;
    }
    setDownloadingResume(true);
    try {
      await downloadFile(
        resolveResumeUrl(applicant.resume),
        resumeFilename(applicant.applicant?.name),
        applicant.applicationId
      );
    } catch (err) {
      console.error("Resume download failed:", err);
      toast.error("Couldn't download the resume — try opening it in a new tab instead.");
    } finally {
      setDownloadingResume(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50" style={{ maxHeight: "calc(100dvh - 50px)", overflowY: "auto" }}>
      {/* Page Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalApplications} application{totalApplications !== 1 ? "s" : ""} across your job listings
          </p>
        </div>

        {/* Status summary strip */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                statusFilter === s ? `${statusConfig[s].bg} ${statusConfig[s].text} ring-1 ring-inset ring-current` : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[s].dot}`} />
              {s} <span className="font-bold">{statusCounts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate name or job title…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0 ? "border-primary/40 bg-primary/5 text-primary" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter size={14} /> Filters {activeFilterCount > 0 && <span className="rounded-full bg-primary text-white text-[10px] px-1.5 py-0.5">{activeFilterCount}</span>}
          </button>
          {(activeFilterCount > 0 || search) && (
            <button onClick={clearFilters} className="flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Job</label>
              <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">All jobs</option>
                {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Applied after</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Applied before</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center">
          <p className="text-sm font-medium text-red-600">Couldn't load applications.</p>
          <button onClick={() => setPage((p) => p)} className="mt-3 text-sm font-medium text-primary hover:underline">Try again</button>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-7 w-20 animate-pulse rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-700">
            {activeFilterCount > 0 || search ? "No applications match these filters" : "No applicants yet"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeFilterCount > 0 || search ? "Try a different search or clear the filters." : "Applications will appear here once candidates apply to your jobs."}
          </p>
        </div>
      ) : selected ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[760px] animate-fade-in">
          {/* ── Left Column: Compact Applicant Queue ── */}
          <div className="w-full lg:w-[360px] xl:w-[400px] border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50/50 flex flex-col flex-shrink-0">
            {/* Queue Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Applicant Queue</h3>
                <p className="text-xs text-gray-500">{applications.length} applications loaded</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer shadow-2xs"
                title="Return to full table view"
              >
                <Table size={13} className="text-primary" />
                <span>Full Table</span>
              </button>
            </div>

            {/* Scrollable list of applicants */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[640px]">
              {applications.map((applicant) => {
                const isActive = selected?.applicationId === applicant.applicationId;
                return (
                  <button
                    key={applicant.applicationId}
                    onClick={() => setSelected(applicant)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? "bg-orange-50/80 border-l-4 border-orange-500 shadow-xs"
                        : "hover:bg-white/80 bg-transparent border-l-4 border-transparent"
                    }`}
                  >
                    <Avatar name={applicant.applicant?.name} photo={applicant.applicant?.profilePic} size={10} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm font-bold truncate ${isActive ? "text-orange-950" : "text-gray-900"}`}>
                          {applicant.applicant?.name || "No name"}
                        </p>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{formatDate(applicant.appliedAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1.5">{applicant.job?.title || "Job removed"}</p>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={applicant.status} />
                        {applicant.resume && !isUnrecoverableResumePath(applicant.resume) && (
                          <span className="text-[10px] font-medium text-gray-400 flex items-center gap-0.5">
                            <FileText size={10} /> PDF
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Queue Footer */}
            <div className="p-3 border-t border-gray-200 bg-white flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

          {/* ── Right Column: Full Candidate Dossier (Fills 100% of Remaining Width!) ── */}
          <div className="flex-1 min-w-0 bg-white flex flex-col">
            {/* Header with Candidate Context & Primary Actions */}
            <div className="border-b border-gray-200 p-5 bg-gradient-to-r from-gray-50/60 via-white to-orange-50/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar name={selected.applicant?.name} photo={selected.applicant?.profilePic} size={14} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900 leading-snug truncate">
                        {selected.applicant?.name || "Applicant"}
                      </h2>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <Briefcase size={12} className="text-primary" /> {selected.job?.title || "Job removed"}
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar size={12} /> Applied {new Date(selected.appliedAt).toLocaleDateString()}
                      </span>
                      {selected.applicant?.email && (
                        <a
                          href={`mailto:${selected.applicant.email}`}
                          className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors"
                        >
                          <Mail size={12} /> {selected.applicant.email}
                        </a>
                      )}
                      {selected.howDidYouHear && (
                        <span className="text-gray-400">Via: {selected.howDidYouHear}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected.applicationId, e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setInterviewModalFor(selected.applicationId);
                      setInterviewDate("");
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-xs hover:shadow-md active:scale-98 transition-all cursor-pointer"
                    title="Schedule interview with candidate"
                  >
                    <Calendar size={14} />
                    <span>Schedule Interview</span>
                  </button>

                  <button
                    onClick={() => handleMessageCandidate(selected.applicant?._id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    title="Start real-time chat with candidate"
                  >
                    <MessageSquare size={14} className="text-primary" />
                    <span>Message</span>
                  </button>

                  {selected.resume && !isUnrecoverableResumePath(selected.resume) && (
                    <button
                      onClick={() => handleDownloadResume(selected)}
                      disabled={downloadingResume}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      title="Download PDF resume"
                    >
                      <Download size={14} className="text-gray-500" />
                      <span>{downloadingResume ? "Downloading…" : "Resume"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelected(null)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer ml-1"
                    title="Close dossier (Return to full table view)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 mt-5 border-b border-gray-200 -mb-5">
                {[
                  { key: "resume", label: "Resume Preview", icon: FileText, count: selected.resume ? "PDF" : null },
                  { key: "coverLetter", label: "Cover Letter", icon: Mail, count: null },
                  { key: "profile", label: "Candidate Background", icon: User, count: selected.applicant?.skills?.length ?? null },
                  { key: "interview", label: "Interview & Stages", icon: Calendar, count: selected.status === "Interview Scheduled" ? "Scheduled" : null },
                ].map(({ key, label, icon: Icon, count }) => {
                  const isActive = selectedTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedTab(key as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                        isActive
                          ? "border-orange-500 text-orange-600 bg-orange-50/50"
                          : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                      {count && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? "bg-orange-200/80 text-orange-800" : "bg-gray-200/70 text-gray-600"
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dossier Body Content */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-280px)]">
              {/* Tab 1: Resume Preview */}
              {selectedTab === "resume" && (
                <div>
                  {!selected.resume ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
                      <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                      <h4 className="text-base font-bold text-gray-700">No resume attached</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        This applicant did not attach a PDF resume or applied using their online profile.
                      </p>
                    </div>
                  ) : isUnrecoverableResumePath(selected.resume) ? (
                    <div className="rounded-2xl border border-amber-200 p-8 text-center bg-amber-50">
                      <AlertCircle size={28} className="mx-auto text-amber-600 mb-2" />
                      <h4 className="text-sm font-bold text-amber-900">Resume file unavailable</h4>
                      <p className="text-xs text-amber-700 mt-1 max-w-sm mx-auto">
                        This resume file was stored on an earlier server and is no longer available. You can message the candidate to request a fresh copy.
                      </p>
                      <button
                        onClick={() => handleMessageCandidate(selected.applicant?._id)}
                        className="mt-3 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        Message Candidate
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const authorizedUrl = getAuthorizedApplicationResumeUrl(selected.applicationId);
                      const cleanUrl = authorizedUrl || resolveResumeUrl(selected.resume);
                      return (
                        <div className="space-y-3">
                          {/* Viewer Toolbar */}
                          <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
                            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                              <FileText size={13} className="text-primary" /> {resumeFilename(selected.applicant?.name)}
                            </span>
                            <div className="flex items-center gap-3">
                              <a
                                href={cleanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-primary transition-colors"
                              >
                                <ExternalLink size={13} /> Open in new tab
                              </a>
                              <button
                                onClick={() => handleDownloadResume(selected)}
                                disabled={downloadingResume}
                                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
                              >
                                <Download size={13} /> Download PDF
                              </button>
                            </div>
                          </div>

                          {/* Full Height PDF Viewport */}
                          <iframe
                            src={cleanUrl}
                            title="Resume preview"
                            className="w-full h-[620px] rounded-xl border border-gray-200 bg-white shadow-inner"
                          />
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Tab 2: Formatted Cover Letter */}
              {selectedTab === "coverLetter" && (() => {
                const { subject, paragraphs } = formatCoverLetter(selected.coverLetter);
                return (
                  <div className="space-y-4 max-w-3xl">
                    {subject && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-800 shadow-2xs">
                        <FileText size={13} className="text-orange-600" />
                        <span>Subject: {subject}</span>
                      </div>
                    )}

                    <div className="rounded-2xl border border-gray-200/90 bg-gray-50/60 p-6 sm:p-8 space-y-4 shadow-inner">
                      {paragraphs.length > 0 ? (
                        paragraphs.map((p, idx) => (
                          <p
                            key={idx}
                            className={`text-sm leading-relaxed ${
                              p.startsWith("Dear ")
                                ? "font-bold text-gray-900 text-base"
                                : p.startsWith("Best regards") || p.startsWith("Sincerely")
                                ? "font-semibold text-gray-800 pt-3"
                                : "text-gray-700 font-normal"
                            }`}
                          >
                            {p}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic">No cover letter provided for this application.</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Tab 3: Candidate Background (Skills, Experience, Education) */}
              {selectedTab === "profile" && (
                <div className="space-y-6 max-w-3xl">
                  {/* Skills Cloud */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" /> Key Skills & Competencies
                    </h4>
                    {selected.applicant?.skills && selected.applicant.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selected.applicant.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-xl bg-orange-50 border border-orange-200 text-orange-800 px-3 py-1 text-xs font-semibold shadow-2xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No skills specified on candidate profile.</p>
                    )}
                  </div>

                  {/* Work Experience Timeline */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <Briefcase size={13} className="text-primary" /> Work Experience
                    </h4>
                    {selected.applicant?.experiences && selected.applicant.experiences.length > 0 ? (
                      <div className="space-y-3">
                        {selected.applicant.experiences.map((exp, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
                            <div className="h-9 w-9 rounded-xl bg-orange-100/70 text-orange-600 flex items-center justify-center flex-shrink-0">
                              <Briefcase size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{exp.jobPosition}</p>
                              <p className="text-xs text-gray-600">{exp.institution}</p>
                              <p className="text-xs text-gray-400 mt-1">{exp.duration}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No previous experience records listed.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <GraduationCap size={13} className="text-primary" /> Education & Qualifications
                    </h4>
                    {selected.applicant?.qualifications && selected.applicant.qualifications.length > 0 ? (
                      <div className="space-y-3">
                        {selected.applicant.qualifications.map((q, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
                            <div className="h-9 w-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center flex-shrink-0">
                              <GraduationCap size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{q.degree}</p>
                              <p className="text-xs text-gray-600">{q.institution}{q.year ? `, ${q.year}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No education qualifications listed.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Interview & Stages */}
              {selectedTab === "interview" && (
                <div className="space-y-5 max-w-2xl">
                  {selected.status === "Interview Scheduled" ? (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <Calendar size={16} />
                          </div>
                          <h4 className="text-sm font-bold text-purple-900">Upcoming Interview Scheduled</h4>
                        </div>
                        <button
                          onClick={() => {
                            setInterviewModalFor(selected.applicationId);
                            setInterviewDate("");
                          }}
                          className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          Reschedule
                        </button>
                      </div>

                      {selected.interview?.scheduledAt && (
                        <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                          <Clock size={15} /> {new Date(selected.interview.scheduledAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                        </p>
                      )}

                      {selected.interview?.mode && (
                        <p className="text-xs text-purple-800">
                          <strong>Mode:</strong> {selected.interview.mode}
                        </p>
                      )}

                      {selected.interview?.meetingLink && (
                        <div>
                          <a
                            href={selected.interview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-sm"
                          >
                            <Video size={13} /> Join Interview Meeting →
                          </a>
                        </div>
                      )}

                      {selected.interview?.location && (
                        <p className="text-xs text-purple-800 flex items-center gap-1.5">
                          <MapPin size={13} /> {selected.interview.location}
                        </p>
                      )}

                      {selected.interview?.notes && (
                        <div className="bg-white/80 p-3 rounded-xl border border-purple-200 text-xs text-purple-900">
                          <strong>Instructions:</strong> {selected.interview.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
                      <Calendar size={28} className="mx-auto text-gray-400" />
                      <h4 className="text-sm font-bold text-gray-800">No interview scheduled yet</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Move this applicant forward in your hiring pipeline by setting up an online video interview or phone screening.
                      </p>
                      <button
                        onClick={() => {
                          setInterviewModalFor(selected.applicationId);
                          setInterviewDate("");
                        }}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        Schedule Interview Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Full Table View when no applicant is selected */
        <>
          {/* Desktop Table (Spans 100% of container) */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5"><div className="flex items-center gap-1.5"><User size={12} /> Candidate</div></th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5"><div className="flex items-center gap-1.5"><Briefcase size={12} /> Job Title</div></th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5"><div className="flex items-center gap-1.5"><Calendar size={12} /> Applied</div></th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.map((applicant) => (
                    <tr key={applicant.applicationId} onClick={() => setSelected(applicant)} className="hover:bg-orange-50/40 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={applicant.applicant?.name} photo={applicant.applicant?.profilePic} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{applicant.applicant?.name || <span className="italic text-gray-400">No name</span>}</p>
                            <p className="text-xs text-gray-400 truncate">{applicant.applicant?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm font-medium text-gray-800">{applicant.job?.title || <span className="italic text-gray-400">Job removed</span>}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-gray-500">{formatDate(applicant.appliedAt)}</span></td>
                      <td className="px-5 py-4"><StatusBadge status={applicant.status} /></td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(applicant)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-primary bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary/40 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            <Eye size={12} className="text-primary" /> Review Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="text-sm text-gray-500">Page <span className="font-semibold text-gray-800">{page}</span> of <span className="font-semibold text-gray-800">{totalPages}</span></span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {applications.map((applicant) => (
              <button key={applicant.applicationId} onClick={() => setSelected(applicant)} className="w-full text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-4 active:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <Avatar name={applicant.applicant?.name} photo={applicant.applicant?.profilePic} size={10} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{applicant.applicant?.name || "No name"}</p>
                    <p className="text-xs text-gray-500 truncate">{applicant.job?.title || "Job removed"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(applicant.appliedAt)}</span>
                      <StatusBadge status={applicant.status} />
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 cursor-pointer">
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 cursor-pointer">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Production-grade Interview Scheduling Modal with z-[100] */}
      {interviewModalFor && (() => {
        const modalApp = applications.find((a) => a.applicationId === interviewModalFor) || (selected?.applicationId === interviewModalFor ? selected : null);
        return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 my-auto">
              {/* Modal Header with Candidate Context */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-orange-50/50 to-amber-50/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-sm flex-shrink-0">
                    <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {modalApp?.applicant?.profilePic ? (
                        <img src={resolveMediaUrl(modalApp.applicant.profilePic)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-orange-600">{(modalApp?.applicant?.name || "C")[0].toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900">Schedule Interview</h2>
                      <span className="text-[11px] font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Invite</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      Candidate: <span className="font-semibold text-gray-800">{modalApp?.applicant?.name || "Candidate"}</span>
                      {modalApp?.job?.title ? ` • ${modalApp.job.title}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInterviewModalFor(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="p-6 space-y-4">
                {/* Mode Selection Pills */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Interview Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: "Video Call", icon: Video, label: "Video Call" },
                      { mode: "Phone Call", icon: Phone, label: "Phone Call" },
                      { mode: "In-Person", icon: Building2, label: "In-Person" },
                    ].map(({ mode, icon: Icon, label }) => {
                      const isSelected = interviewMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setInterviewMode(mode)}
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-400/30"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon size={14} className={isSelected ? "text-orange-600" : "text-gray-400"} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Date & Time
                    </label>
                    <span className="text-[11px] text-gray-400">Local time</span>
                  </div>
                  <input
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors cursor-pointer"
                  />
                  {/* Quick Shortcut Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-gray-400 mr-1 flex items-center gap-1"><Clock size={11} /> Quick:</span>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1, 10)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-600 transition-colors cursor-pointer"
                    >
                      Tomorrow 10 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1, 14)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-600 transition-colors cursor-pointer"
                    >
                      Tomorrow 2 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2, 11)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-600 transition-colors cursor-pointer"
                    >
                      In 2 Days 11 AM
                    </button>
                  </div>
                </div>

                {/* Location / Link */}
                {interviewMode === "In-Person" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Office / Interview Location
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={interviewLocation}
                        onChange={(e) => setInterviewLocation(e.target.value)}
                        placeholder="Company headquarters, Room 402, Building A"
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {interviewMode === "Video Call" ? "Meeting Link" : "Phone Number"}
                      </label>
                      {interviewMode === "Video Call" && (
                        <button
                          type="button"
                          onClick={() => setInterviewLink("https://meet.google.com/new")}
                          className="text-[11px] text-orange-600 hover:text-orange-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Link2 size={11} /> Create Google Meet
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      {interviewMode === "Video Call" ? (
                        <Video size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      ) : (
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      )}
                      <input
                        type="text"
                        value={interviewLink}
                        onChange={(e) => setInterviewLink(e.target.value)}
                        placeholder={
                          interviewMode === "Video Call"
                            ? "https://meet.google.com/… or Zoom link"
                            : modalApp?.applicant?.email ? `Contact ${modalApp.applicant.name}` : "+977-… or candidate phone"
                        }
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Candidate Instructions & Notes (Optional)
                  </label>
                  <textarea
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Please bring your portfolio or prepare for a 15-minute case discussion."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors resize-none"
                  />
                </div>

                {/* Automated notification reassurance */}
                <div className="flex items-start gap-2.5 rounded-xl bg-orange-50/70 border border-orange-200/70 p-3 text-xs text-orange-800">
                  <Mail size={15} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>
                    An automated calendar invitation and email notification will be sent directly to{" "}
                    <strong className="font-semibold text-orange-900">{modalApp?.applicant?.email || "the candidate"}</strong>.
                  </span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setInterviewModalFor(null)}
                  className="flex-1 border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleScheduleInterview}
                  disabled={schedulingLoading || !interviewDate}
                  className="flex-1 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}
                >
                  {schedulingLoading ? (
                    <span>Scheduling…</span>
                  ) : (
                    <>
                      <Calendar size={15} />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Applicants;
