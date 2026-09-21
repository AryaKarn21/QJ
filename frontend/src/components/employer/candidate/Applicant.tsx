import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAllApplicantsForEmployerJobs,
  getEmployerJobs,
  updateApplicationStatus,
  type EmployerApplication,
} from "../employerApi/api";
import {
  Search, ChevronLeft, ChevronRight, FileText, Calendar, User, Mail, Briefcase,
  X, Download, Eye, ExternalLink, GraduationCap, Sparkles, Filter, RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { resolveMediaUrl, resolveResumeUrl, isUnrecoverableResumePath, getAuthorizedApplicationResumeUrl } from "../../../utils/mediaUrl";
import { downloadFile } from "../../../utils/downloadFile";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { FollowButton } from "../../community/FollowButton";

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
};

const Avatar = ({ name, photo, size = 8 }: { name?: string; photo?: string; size?: 8 | 10 }) => (
  <div className={`${AVATAR_SIZE_CLASSES[size]} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
    {photo ? (
      <img src={resolveMediaUrl(photo)} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="text-xs font-bold text-primary">{(name || "?")[0].toUpperCase()}</span>
    )}
  </div>
);

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
  const [downloadingResume, setDownloadingResume] = useState(false);

  const [interviewModalFor, setInterviewModalFor] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState("Video Call");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [schedulingLoading, setSchedulingLoading] = useState(false);

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
      ) : (
        <>
          {/* Desktop table */}
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
                    <tr key={applicant.applicationId} onClick={() => setSelected(applicant)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={applicant.applicant?.name} photo={applicant.applicant?.profilePic} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{applicant.applicant?.name || <span className="italic text-gray-400">No name</span>}</p>
                            <p className="text-xs text-gray-400 truncate">{applicant.applicant?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm font-medium text-gray-800">{applicant.job?.title || <span className="italic text-gray-400">Job removed</span>}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-gray-500">{formatDate(applicant.appliedAt)}</span></td>
                      <td className="px-5 py-4"><StatusBadge status={applicant.status} /></td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelected(applicant)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary border border-gray-200 hover:border-primary/40 px-3 py-1.5 rounded-lg transition-all">
                            <Eye size={12} /> View
                          </button>
                          {applicant.applicant?._id && (
                            <FollowButton
                              userId={applicant.applicant._id}
                              initialFollowing={false}
                              size="xs"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="text-sm text-gray-500">Page <span className="font-semibold text-gray-800">{page}</span> of <span className="font-semibold text-gray-800">{totalPages}</span></span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {applications.map((applicant) => (
              <button key={applicant.applicationId} onClick={() => setSelected(applicant)} className="w-full text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-4 active:bg-gray-50 transition-colors">
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
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40">
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Application Details Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setSelected(null)} />
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={selected.applicant?.name} photo={selected.applicant?.profilePic} size={10} />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">{selected.applicant?.name || "Applicant"}</h2>
                  <p className="text-xs text-gray-400 truncate">{selected.job?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selected.applicant?._id && (
                  <FollowButton
                    userId={selected.applicant._id}
                    initialFollowing={false}
                    size="xs"
                  />
                )}
                <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status + actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                <StatusBadge status={selected.status} />
                <div className="flex items-center gap-2">
                  {selected.applicant?._id && (
                    <a
                      href={`/community/profile/${selected.applicant._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/20"
                    >
                      <User size={12} /> View Profile <ExternalLink size={10} />
                    </a>
                  )}
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected.applicationId, e.target.value)}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Contact */}
              <div className="rounded-xl border border-gray-200 p-3.5 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><Mail size={12} /> Contact</p>
                <p className="text-sm text-gray-700">{selected.applicant?.email || "—"}</p>
              </div>

              {/* Applied job info */}
              <div className="rounded-xl border border-gray-200 p-3.5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><Briefcase size={12} /> Applied for</p>
                <p className="text-sm font-medium text-gray-800">{selected.job?.title || "Job removed"}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1"><Calendar size={11} /> Applied {new Date(selected.appliedAt).toLocaleString()}</p>
                {selected.howDidYouHear && <p className="text-xs text-gray-400 mt-1">Heard about this role via: {selected.howDidYouHear}</p>}
              </div>

              {/* Skills */}
              {selected.applicant?.skills && selected.applicant.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5"><Sparkles size={12} /> Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.applicant.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {selected.applicant?.experiences && selected.applicant.experiences.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5"><Briefcase size={12} /> Experience</p>
                  <div className="space-y-2">
                    {selected.applicant.experiences.map((exp, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <p className="font-medium">{exp.jobPosition} <span className="text-gray-400 font-normal">— {exp.institution}</span></p>
                        <p className="text-xs text-gray-400">{exp.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qualifications */}
              {selected.applicant?.qualifications && selected.applicant.qualifications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5"><GraduationCap size={12} /> Education</p>
                  <div className="space-y-1.5">
                    {selected.applicant.qualifications.map((q, i) => (
                      <p key={i} className="text-sm text-gray-700">{q.degree} <span className="text-gray-400">— {q.institution}{q.year ? `, ${q.year}` : ""}</span></p>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover letter */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5"><FileText size={12} /> Cover letter</p>
                <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3.5 text-sm text-gray-600 leading-relaxed">{selected.coverLetter}</p>
              </div>

              {/* Resume */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><FileText size={12} /> Resume</p>
                  {selected.resume && !isUnrecoverableResumePath(selected.resume) && (
                    <button
                      onClick={() => handleDownloadResume(selected)}
                      disabled={downloadingResume}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      <Download size={13} /> {downloadingResume ? "Downloading…" : "Download"}
                    </button>
                  )}
                </div>

                {!selected.resume ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
                    This applicant didn't attach a resume.
                  </div>
                ) : isUnrecoverableResumePath(selected.resume) ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
                    Resume unavailable — please ask the applicant to upload again
                  </div>
                ) : (
                  (() => {
                    const authorizedUrl = getAuthorizedApplicationResumeUrl(selected.applicationId);
                    const cleanUrl = authorizedUrl || resolveResumeUrl(selected.resume);

                    return (
                      <div className="space-y-2">
                        <iframe
                          src={cleanUrl}
                          title="Resume preview"
                          className="h-80 w-full rounded-xl border border-gray-200 bg-white"
                        />
                        <div className="flex items-center justify-between">
                          <a
                            href={cleanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary"
                          >
                            <ExternalLink size={12} /> Open original PDF in new tab
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDownloadResume(selected)}
                            disabled={downloadingResume}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Download size={12} /> {downloadingResume ? "Downloading…" : "Download"}
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduling Modal */}
      {interviewModalFor && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar size={16} className="text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Schedule Interview</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5 ml-11">The candidate will be emailed these details automatically.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Date & Time</label>
                <input type="datetime-local" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Mode</label>
                <select value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="Video Call">Video Call</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="In-Person">In-Person</option>
                </select>
              </div>
              {interviewMode === "In-Person" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Location</label>
                  <input type="text" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} placeholder="Office address" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">{interviewMode === "Video Call" ? "Meeting Link" : "Phone Number"}</label>
                  <input type="text" value={interviewLink} onChange={(e) => setInterviewLink(e.target.value)} placeholder={interviewMode === "Video Call" ? "https://meet.google.com/…" : "+977-…"} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                <textarea value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} rows={3} placeholder="Anything the candidate should prepare or know in advance" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setInterviewModalFor(null)} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleScheduleInterview} disabled={schedulingLoading} className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {schedulingLoading ? "Scheduling…" : "Schedule & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applicants;