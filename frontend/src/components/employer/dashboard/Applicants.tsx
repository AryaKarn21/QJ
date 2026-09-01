import { useEffect, useState } from "react";
import { getAllApplicantsForEmployerJobs, updateApplicationStatus } from "../employerApi/api";
import { Eye, Pencil, ChevronLeft, ChevronRight, FileText, Calendar, User, Mail, Briefcase } from "lucide-react";
import { toast } from "react-toastify";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Pending:              { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400" },
  Reviewed:             { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400" },
  "Interview Scheduled":{ bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
  Accepted:             { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-400" },
  Rejected:             { bg: "bg-red-50",     text: "text-red-600",    dot: "bg-red-400" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const Applicants = () => {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const [interviewModalFor, setInterviewModalFor] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState("Video Call");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  const fetchApplicants = async (page: number) => {
    setLoading(true);
    try {
      const res = await getAllApplicantsForEmployerJobs(page);
      setData(
        res.data.flatMap((job: any) =>
          job.applicants.map((applicant: any) => ({
            ...applicant,
            jobTitle: job.jobTitle,
            jobId: job.jobId,
          }))
        )
      );
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Error fetching applicants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants(page);
  }, [page]);

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    if (newStatus === "Interview Scheduled") {
      setInterviewModalFor(applicationId);
      setEditingStatus(null);
      return;
    }
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setData((prev) =>
        prev.map((app) =>
          app.applicationId === applicationId ? { ...app, status: newStatus } : app
        )
      );
      setEditingStatus(null);
      toast.success(`Status updated to "${newStatus}". Candidate notified by email.`);
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
      await updateApplicationStatus(interviewModalFor, "Interview Scheduled", {
        scheduledAt: new Date(interviewDate).toISOString(),
        mode: interviewMode,
        meetingLink: interviewLink,
        location: interviewLocation,
        notes: interviewNotes,
      });
      setData((prev) =>
        prev.map((app) =>
          app.applicationId === interviewModalFor ? { ...app, status: "Interview Scheduled" } : app
        )
      );
      toast.success("Interview scheduled — the candidate has been emailed the details.");
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

  return (
    <div className="min-h-screen p-6 bg-gray-50" style={{ maxHeight: "calc(100vh - 50px)", overflowY: "auto" }}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Applicants</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.length} applicant{data.length !== 1 ? "s" : ""} across your job listings
        </p>
      </div>

      {loading ? (
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
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-700">No applicants yet</p>
          <p className="text-sm text-gray-400 mt-1">Applications will appear here once candidates apply to your jobs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">
                    <div className="flex items-center gap-1.5"><Briefcase size={12} /> Job Title</div>
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">
                    <div className="flex items-center gap-1.5"><User size={12} /> Candidate</div>
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">
                    <div className="flex items-center gap-1.5"><Mail size={12} /> Email</div>
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">
                    <div className="flex items-center gap-1.5"><Calendar size={12} /> Applied</div>
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Cover Letter</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Resume</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((applicant) => (
                  <tr key={applicant.applicationId} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-800">{applicant.jobTitle}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(applicant.applicant?.name || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {applicant.applicant?.name || <span className="italic text-gray-400">No name</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">
                        {applicant.applicant?.email || <span className="italic text-gray-400">No email</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {editingStatus === applicant.applicationId ? (
                        <select
                          autoFocus
                          value={applicant.status}
                          onChange={(e) => handleStatusChange(applicant.applicationId, e.target.value)}
                          onBlur={() => setEditingStatus(null)}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Reviewed">Reviewed</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      ) : (
                        <StatusBadge status={applicant.status} />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(applicant.appliedAt).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedCoverLetter(applicant.coverLetter)}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        <FileText size={13} /> View letter
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {applicant.resume ? (
                        <a
                          href={`${MEDIA_URL.replace(/\/$/, "")}/${applicant.resume.replace(/\\/g, "/").replace(/^.*\/uploads/, "uploads")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary hover:text-white transition-all">
                            <Eye size={13} /> Resume
                          </button>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No resume</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setEditingStatus(applicant.applicationId)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary border border-gray-200 hover:border-primary/40 px-3 py-1.5 rounded-lg transition-all"
                        title="Edit status"
                      >
                        <Pencil size={12} /> Edit Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <span className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-800">{page}</span> of{" "}
              <span className="font-semibold text-gray-800">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Cover Letter Modal */}
      {selectedCoverLetter && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-primary" /> Cover Letter
              </h2>
              <button
                onClick={() => setSelectedCoverLetter(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedCoverLetter}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedCoverLetter(null)}
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduling Modal */}
      {interviewModalFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
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
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Mode</label>
                <select
                  value={interviewMode}
                  onChange={(e) => setInterviewMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="Video Call">Video Call</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="In-Person">In-Person</option>
                </select>
              </div>

              {interviewMode === "In-Person" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Location</label>
                  <input
                    type="text"
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    placeholder="Office address"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    {interviewMode === "Video Call" ? "Meeting Link" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                    placeholder={interviewMode === "Video Call" ? "https://meet.google.com/…" : "+977-…"}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything the candidate should prepare or know in advance"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setInterviewModalFor(null)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleInterview}
                disabled={schedulingLoading}
                className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
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