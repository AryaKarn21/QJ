import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllApplicantsForEmployerJobs,
  getEmployerJobs,
  updateApplicationStatus,
  resendInterviewEmail,
  updateInterviewOutcome,
  previewApplicationEmail,
  sendCustomMessageToCandidate,
  type EmployerApplication,
  type InterviewType,
} from "../employerApi/api";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  User,
  Mail,
  Briefcase,
  X,
  Download,
  Eye,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Filter,
  RotateCcw,
  MessageSquare,
  Video,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  Link2,
  MapPin,
  ArrowLeft,
  AlertCircle,
  Globe,
  ChevronDown,
  ClipboardCheck,
  Send,
  UserX,
  Award,
  Ban,
} from "lucide-react";
import { toast } from "react-toastify";
import { AssignAssessmentModal } from "./AssignAssessmentModal";
import EmailPreviewModal from "../../shared/EmailPreviewModal";
import AssessmentResultsModal from "./AssessmentResultsModal";
import {
  resolveMediaUrl,
  resolveResumeUrl,
  isUnrecoverableResumePath,
  getAuthorizedApplicationResumeUrl,
} from "../../../utils/mediaUrl";
import { downloadFile } from "../../../utils/downloadFile";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { openConversationWith } from "../../../api/messageApi";

const statusConfig: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    border: "border-amber-200",
  },
  Reviewed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
    border: "border-blue-200",
  },
  Shortlisted: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    dot: "bg-cyan-400",
    border: "border-cyan-200",
  },
  "Assessment Assigned": {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-400",
    border: "border-indigo-200",
  },
  "Interview Scheduled": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-400",
    border: "border-purple-200",
  },
  Accepted: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
    border: "border-emerald-200",
  },
  Rejected: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-400",
    border: "border-rose-200",
  },
};

// "Assessment Assigned" deliberately excluded — only reachable via the
// "Assign Assessment" action (it needs an actual assessment picked/
// created), never a bare status pick. Backend enforces the same rule (see
// employerController.js's updateApplication).
const STATUS_OPTIONS = [
  "Pending",
  "Reviewed",
  "Shortlisted",
  "Interview Scheduled",
  "Accepted",
  "Rejected",
];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? {
    bg: "bg-gray-50",
    text: "text-gray-600",
    dot: "bg-gray-400",
    border: "border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const AVATAR_SIZE_CLASSES: Record<number, string> = {
  8: "h-8 w-8 text-xs",
  10: "h-10 w-10 text-xs",
  12: "h-12 w-12 text-sm",
  14: "h-14 w-14 text-base",
  16: "h-16 w-16 text-lg",
};

const Avatar = ({
  name,
  photo,
  size = 10,
}: {
  name?: string;
  photo?: string;
  size?: 8 | 10 | 12 | 14 | 16;
}) => (
  <div
    className={`${AVATAR_SIZE_CLASSES[size]} rounded-full bg-orange-100/80 border border-orange-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs`}
  >
    {photo ? (
      <img
        src={resolveMediaUrl(photo)}
        alt={name || "Applicant avatar"}
        className="h-full w-full object-cover"
      />
    ) : (
      <span className="font-bold text-orange-700">
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
    body = body
      .slice(subjectMatch[0].length - (subjectMatch[2] ? subjectMatch[2].length : 0))
      .trim();
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

function formatNepalDateTime(isoDateString?: string) {
  if (!isoDateString) return { date: "Not set", time: "Not set", full: "" };
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return { date: "Not set", time: "Not set", full: "" };

    const dateStr = d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kathmandu",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kathmandu",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return {
      date: dateStr,
      time: `${timeStr} NPT`,
      full: `${dateStr} at ${timeStr} NPT`,
    };
  } catch {
    return { date: "Not set", time: "Not set", full: "" };
  }
}

const resumeFilename = (name?: string) =>
  `${(name || "applicant")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase() || "applicant"}-resume.pdf`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
  const [selectedTab, setSelectedTab] = useState<
    "resume" | "coverLetter" | "profile" | "interview"
  >("resume");
  const [downloadingResume, setDownloadingResume] = useState(false);

  const [interviewModalFor, setInterviewModalFor] = useState<string | null>(null);
  const [assessmentModalFor, setAssessmentModalFor] = useState<string | null>(null);
  const [resultsModalFor, setResultsModalFor] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMode, setInterviewMode] = useState("Video Call");
  const [interviewType, setInterviewType] = useState("");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewCustomMessage, setInterviewCustomMessage] = useState("");
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showInterviewPreview, setShowInterviewPreview] = useState(false);
  const [outcomeLoading, setOutcomeLoading] = useState(false);

  const [cancelModalFor, setCancelModalFor] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTargetStatus, setCancelTargetStatus] = useState("Shortlisted");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelPreview, setShowCancelPreview] = useState(false);

  const [messageModalFor, setMessageModalFor] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (selected) {
      // Default to resume if available, otherwise cover letter or background
      if (selected.resume) {
        setSelectedTab("resume");
      } else if (selected.coverLetter) {
        setSelectedTab("coverLetter");
      } else {
        setSelectedTab("profile");
      }
    }
  }, [selected?.applicationId]);

  const setQuickDate = (offsetDays: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      toast.error(
        err?.response?.data?.message || "Could not open conversation with candidate."
      );
    }
  };

  const activeFilterCount = [statusFilter, jobFilter, dateFrom, dateTo].filter(
    Boolean
  ).length;

  useEffect(() => {
    getEmployerJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, jobFilter, dateFrom, dateTo]);

  const fetchIdRef = useRef(0);
  const fetchApplicants = useCallback(
    async (opts: { silent?: boolean } = {}) => {
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

        // Keep selected candidate in sync if open
        if (selected) {
          const fresh = res.applications.find(
            (a) => a.applicationId === selected.applicationId
          );
          if (fresh) setSelected(fresh);
        }
      } catch (err) {
        console.error("Error fetching applicants:", err);
        if (fetchId === fetchIdRef.current) setError(true);
      } finally {
        if (fetchId === fetchIdRef.current && !opts.silent) setLoading(false);
      }
    },
    [page, debouncedSearch, statusFilter, jobFilter, dateFrom, dateTo, selected?.applicationId]
  );

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);
  useAutoRefresh(() => fetchApplicants({ silent: true }), 30000);

  const clearFilters = () => {
    setStatusFilter("");
    setJobFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const applyStatusLocally = (
    applicationId: string,
    newStatus: string,
    updatedInterview?: EmployerApplication["interview"]
  ) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.applicationId === applicationId
          ? {
              ...a,
              status: newStatus as EmployerApplication["status"],
              ...(updatedInterview ? { interview: updatedInterview } : {}),
            }
          : a
      )
    );
    setSelected((prev) =>
      prev && prev.applicationId === applicationId
        ? {
            ...prev,
            status: newStatus as EmployerApplication["status"],
            ...(updatedInterview ? { interview: updatedInterview } : {}),
          }
        : prev
    );
  };

  const handleStatusChange = async (
    applicationId: string,
    newStatus: string
  ) => {
    if (newStatus === "Interview Scheduled") {
      setInterviewModalFor(applicationId);
      const app = applications.find((a) => a.applicationId === applicationId);
      if (app?.interview?.scheduledAt) {
        const d = new Date(app.interview.scheduledAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setInterviewDate(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}`
        );
        setInterviewMode(app.interview.mode || "Video Call");
        setInterviewType(app.interview.type || "");
        setInterviewLink(app.interview.meetingLink || "");
        setInterviewLocation(app.interview.location || "");
        setInterviewNotes(app.interview.notes || "");
      }
      return;
    }

    try {
      const res = await updateApplicationStatus(applicationId, newStatus);
      applyStatusLocally(applicationId, newStatus);
      if (res?.email?.sent === false || res?.emailSent === false) {
        toast.warn(
          `Status updated to "${newStatus}", but notification email could not be sent.`
        );
      } else if (res?.email?.sent === true || res?.emailSent === true) {
        toast.success(
          `Status updated to "${newStatus}". Candidate notified by email.`
        );
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
      const res = await updateApplicationStatus(
        interviewModalFor,
        "Interview Scheduled",
        {
          scheduledAt: new Date(interviewDate).toISOString(),
          mode: interviewMode,
          type: (interviewType || undefined) as InterviewType | undefined,
          meetingLink: interviewLink,
          location: interviewLocation,
          notes: interviewNotes,
        },
        { customMessage: interviewCustomMessage.trim() || undefined }
      );

      applyStatusLocally(
        interviewModalFor,
        "Interview Scheduled",
        res.updatedApplication?.interview
      );

      if (res?.email?.sent === true) {
        toast.success(
          `Interview scheduled — confirmation email sent to ${
            res.email.recipient || "candidate"
          }.`
        );
      } else if (res?.email?.sent === false) {
        const errorDetail = res.email.error || res.email.message;
        toast.warn(
          `Interview scheduled, but confirmation email could not be sent to ${
            res.email.recipient || "candidate"
          }${errorDetail ? `: ${errorDetail}` : ". Check server email configuration."}`
        );
      } else {
        toast.success("Interview scheduled successfully.");
      }

      setInterviewModalFor(null);
      setInterviewDate("");
      setInterviewMode("Video Call");
      setInterviewType("");
      setInterviewLink("");
      setInterviewLocation("");
      setInterviewNotes("");
      setInterviewCustomMessage("");
    } catch (err) {
      console.error("Failed to schedule interview:", err);
      toast.error("Failed to schedule interview.");
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleCancelInterview = async () => {
    if (!cancelModalFor) return;
    setCancelling(true);
    try {
      const res = await updateApplicationStatus(cancelModalFor, cancelTargetStatus, undefined, {
        cancellationReason: cancelReason.trim() || undefined,
      });
      applyStatusLocally(cancelModalFor, cancelTargetStatus);
      if (res?.email?.sent === true) {
        toast.success("Interview cancelled. Candidate notified by email.");
      } else {
        toast.success("Interview cancelled.");
      }
      setCancelModalFor(null);
      setCancelReason("");
      setCancelTargetStatus("Shortlisted");
    } catch (err) {
      console.error("Failed to cancel interview:", err);
      toast.error("Failed to cancel interview.");
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkOutcome = async (applicationId: string, outcome: "COMPLETED" | "NO_SHOW") => {
    setOutcomeLoading(true);
    try {
      const res = await updateInterviewOutcome(applicationId, outcome);
      setApplications((prev) =>
        prev.map((a) => (a.applicationId === applicationId ? { ...a, interview: res.interview } : a))
      );
      setSelected((prev) => (prev && prev.applicationId === applicationId ? { ...prev, interview: res.interview } : prev));
      toast.success(`Interview marked as ${outcome === "NO_SHOW" ? "no-show" : "completed"}.`);
    } catch (err) {
      console.error("Failed to update interview outcome:", err);
      toast.error("Failed to update interview outcome.");
    } finally {
      setOutcomeLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageModalFor || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await sendCustomMessageToCandidate(messageModalFor, messageText.trim());
      toast.success(res.emailSent ? "Message sent — candidate notified by email." : "Message sent as an in-app notification (email delivery failed).");
      setMessageModalFor(null);
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResendEmail = async (applicationId: string) => {
    setResendingEmail(true);
    try {
      const res = await resendInterviewEmail(applicationId);
      if (res?.email?.sent) {
        toast.success(
          `Interview confirmation email resent to ${res.email.recipient}.`
        );
        if (selected && selected.applicationId === applicationId) {
          setSelected((prev) =>
            prev
              ? {
                  ...prev,
                  interview: {
                    ...prev.interview,
                    emailStatus: "sent",
                    emailSentAt: new Date().toISOString(),
                    emailError: "",
                  },
                }
              : prev
          );
        }
      } else {
        toast.warn(
          `Could not send email to ${
            res?.email?.recipient || "candidate"
          }. Please verify server mail settings.`
        );
      }
    } catch (err: any) {
      console.error("Failed to resend interview email:", err);
      toast.error(
        err?.response?.data?.message || "Failed to resend interview email."
      );
    } finally {
      setResendingEmail(false);
    }
  };

  const handleDownloadResume = async (applicant: EmployerApplication) => {
    if (!applicant.resume) return;
    if (isUnrecoverableResumePath(applicant.resume)) {
      toast.error(
        "Resume unavailable — please ask the applicant to upload again."
      );
      return;
    }
    setDownloadingResume(true);
    try {
      await downloadFile(
        resolveResumeUrl(applicant.resume),
        resumeFilename(applicant.applicant?.name),
        applicant.applicationId
      );
      toast.success("Resume downloaded successfully.");
    } catch (err) {
      console.error("Resume download failed:", err);
      toast.error(
        "Couldn't download the resume — try opening it in a new tab instead."
      );
    } finally {
      setDownloadingResume(false);
    }
  };

  // Switch to next or previous candidate inside review workspace
  const currentSelectedIndex = selected
    ? applications.findIndex((a) => a.applicationId === selected.applicationId)
    : -1;
  const hasPrevCandidate = currentSelectedIndex > 0;
  const hasNextCandidate =
    currentSelectedIndex >= 0 && currentSelectedIndex < applications.length - 1;

  const goToPrevCandidate = () => {
    if (hasPrevCandidate) {
      setSelected(applications[currentSelectedIndex - 1]);
    }
  };

  const goToNextCandidate = () => {
    if (hasNextCandidate) {
      setSelected(applications[currentSelectedIndex + 1]);
    }
  };

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 bg-slate-50 text-slate-900"
      style={{ maxHeight: "calc(100dvh - 50px)", overflowY: "auto" }}
    >
      {/* ─────────────────────────────────────────────────────────────
          CANDIDATE REVIEW WORKSPACE (When an applicant is selected)
      ───────────────────────────────────────────────────────────── */}
      {selected ? (
        <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
          {/* Top Bar: Back Button & Quick Candidate Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors cursor-pointer group"
              title="Return to applications list"
            >
              <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-orange-50 text-gray-600 group-hover:text-orange-600 transition-colors">
                <ArrowLeft size={16} />
              </div>
              <span>Back to Applications</span>
            </button>

            {/* Candidate Index & Next/Prev Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500">
              {currentSelectedIndex >= 0 && (
                <span>
                  Candidate{" "}
                  <strong className="text-gray-900 font-bold">
                    {currentSelectedIndex + 1}
                  </strong>{" "}
                  of {applications.length}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goToPrevCandidate}
                  disabled={!hasPrevCandidate}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 cursor-pointer"
                  title="Previous candidate"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={goToNextCandidate}
                  disabled={!hasNextCandidate}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 cursor-pointer"
                  title="Next candidate"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop 2-Column / Mobile 1-Column Responsive Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Left / Main Section (Candidate Profile, Tabs, Content) ── */}
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Candidate Profile Header */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 sm:p-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                  <Avatar
                    name={selected.applicant?.name}
                    photo={selected.applicant?.profilePic}
                    size={16}
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                        {selected.applicant?.name || "Candidate"}
                      </h2>
                      <StatusBadge status={selected.status} />
                    </div>

                    <p className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                      <Briefcase size={15} />
                      <span>{selected.job?.title || "Job removed"}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 pt-1">
                      {selected.applicant?.email && (
                        <a
                          href={`mailto:${selected.applicant.email}`}
                          className="inline-flex items-center gap-1.5 text-gray-600 hover:text-orange-600 transition-colors"
                          title="Click to email candidate directly"
                        >
                          <Mail size={13} className="text-gray-400" />
                          <span>{selected.applicant.email}</span>
                        </a>
                      )}

                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        <Calendar size={13} className="text-gray-400" />
                        <span>Applied: {formatDate(selected.appliedAt)}</span>
                      </span>

                      {selected.howDidYouHear && (
                        <span className="inline-flex items-center gap-1.5 text-gray-500">
                          <Link2 size={13} className="text-gray-400" />
                          <span>Source: {selected.howDidYouHear}</span>
                        </span>
                      )}
                    </div>

                    {/* Headline if available */}
                    {selected.applicant?.headline && (
                      <p className="text-xs text-gray-600 pt-1 italic">
                        "{selected.applicant.headline}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Actions Stack (Visible only on < lg screens) */}
              <div className="block lg:hidden bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setInterviewModalFor(selected.applicationId);
                      setInterviewDate("");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #EA580C)",
                    }}
                  >
                    <Calendar size={15} />
                    <span>
                      {selected.status === "Interview Scheduled"
                        ? "Reschedule Interview"
                        : "Schedule Interview"}
                    </span>
                  </button>

                  {selected.status === "Interview Scheduled" && (
                    <button
                      onClick={() => setCancelModalFor(selected.applicationId)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Ban size={15} />
                      <span>Cancel Interview</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      handleMessageCandidate(selected.applicant?._id)
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <MessageSquare size={15} className="text-orange-600" />
                    <span>Message Candidate</span>
                  </button>

                  <button
                    onClick={() => setMessageModalFor(selected.applicationId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Send size={15} className="text-orange-600" />
                    <span>Send Message</span>
                  </button>

                  <button
                    onClick={() => setAssessmentModalFor(selected.applicationId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <ClipboardCheck size={15} className="text-orange-600" />
                    <span>
                      {selected.assessment?.assessment ? "Reassign Assessment" : "Assign Assessment"}
                    </span>
                  </button>

                  {selected.assessment?.status &&
                    ["submitted", "evaluated"].includes(selected.assessment.status) && (
                      <button
                        onClick={() => setResultsModalFor(selected.applicationId)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Award size={15} className="text-orange-600" />
                        <span>View Assessment Results</span>
                      </button>
                    )}

                  {selected.resume &&
                    !isUnrecoverableResumePath(selected.resume) && (
                      <button
                        onClick={() => handleDownloadResume(selected)}
                        disabled={downloadingResume}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Download size={15} className="text-gray-500" />
                        <span>
                          {downloadingResume
                            ? "Downloading Resume…"
                            : "Download Resume"}
                        </span>
                      </button>
                    )}

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Update Application Status
                    </label>
                    <div className="relative">
                      <select
                        value={selected.status}
                        onChange={(e) =>
                          handleStatusChange(
                            selected.applicationId,
                            e.target.value
                          )
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer appearance-none pr-8"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Responsive Tabs Navigation */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50/70 px-2 sm:px-4">
                  <div
                    className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth"
                    role="tablist"
                  >
                    {[
                      {
                        key: "resume",
                        label: "Resume",
                        icon: FileText,
                        badge:
                          selected.resume &&
                          !isUnrecoverableResumePath(selected.resume)
                            ? "PDF"
                            : null,
                      },
                      {
                        key: "coverLetter",
                        label: "Cover Letter",
                        icon: Mail,
                        badge: selected.coverLetter ? "Provided" : null,
                      },
                      {
                        key: "profile",
                        label: "Candidate Background",
                        icon: User,
                        badge:
                          (selected.applicant?.skills?.length ?? 0) > 0
                            ? `${selected.applicant?.skills?.length} skills`
                            : null,
                      },
                      {
                        key: "interview",
                        label: "Interview & Stages",
                        icon: Calendar,
                        badge:
                          selected.status === "Interview Scheduled"
                            ? "Active"
                            : null,
                      },
                    ].map(({ key, label, icon: Icon, badge }) => {
                      const isActive = selectedTab === key;
                      return (
                        <button
                          key={key}
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setSelectedTab(key as any)}
                          className={`flex items-center gap-2 py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex-shrink-0 cursor-pointer ${
                            isActive
                              ? "border-orange-500 text-orange-600 bg-white"
                              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/60"
                          }`}
                        >
                          <Icon
                            size={16}
                            className={
                              isActive ? "text-orange-600" : "text-gray-400"
                            }
                          />
                          <span>{label}</span>
                          {badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                                isActive
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-200/80 text-gray-600"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Tab Content Container */}
                <div className="p-4 sm:p-6 lg:p-7">
                  {/* ───────────────── TAB 1: RESUME ───────────────── */}
                  {selectedTab === "resume" && (
                    <div className="space-y-4">
                      {!selected.resume ? (
                        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 sm:p-14 text-center bg-gray-50/50">
                          <FileText
                            size={36}
                            className="mx-auto text-gray-300 mb-3"
                          />
                          <h4 className="text-base font-bold text-gray-800">
                            No Resume Attached
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto">
                            This applicant did not attach a PDF resume file. You
                            can review their background and profile details or
                            message them directly.
                          </p>
                          <button
                            onClick={() =>
                              handleMessageCandidate(selected.applicant?._id)
                            }
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                          >
                            <MessageSquare size={14} className="text-orange-600" />
                            <span>Request Resume via Message</span>
                          </button>
                        </div>
                      ) : isUnrecoverableResumePath(selected.resume) ? (
                        <div className="rounded-2xl border border-amber-200 p-8 text-center bg-amber-50">
                          <AlertCircle
                            size={32}
                            className="mx-auto text-amber-600 mb-2"
                          />
                          <h4 className="text-sm font-bold text-amber-900">
                            Resume File Unavailable
                          </h4>
                          <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                            This application references an earlier file path that
                            is no longer accessible on the current storage. You
                            can reach out to the applicant to provide a fresh
                            copy.
                          </p>
                          <button
                            onClick={() =>
                              handleMessageCandidate(selected.applicant?._id)
                            }
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <MessageSquare size={13} />
                            <span>Message Candidate</span>
                          </button>
                        </div>
                      ) : (
                        (() => {
                          const authorizedUrl =
                            getAuthorizedApplicationResumeUrl(
                              selected.applicationId
                            ) || resolveResumeUrl(selected.resume);
                          return (
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-2xs">
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                                <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                                  <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                    <FileText size={24} />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                      {resumeFilename(selected.applicant?.name)}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      PDF Document • Candidate Resume
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-stretch sm:justify-end">
                                  <a
                                    href={authorizedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold transition-colors shadow-2xs flex-1 sm:flex-initial"
                                    title="Open resume in a new browser tab"
                                  >
                                    <ExternalLink size={15} className="text-gray-600" />
                                    <span>Open in new tab</span>
                                  </a>

                                  <button
                                    onClick={() =>
                                      handleDownloadResume(selected)
                                    }
                                    disabled={downloadingResume}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial"
                                    title="Download PDF to your device"
                                  >
                                    <Download size={15} />
                                    <span>
                                      {downloadingResume
                                        ? "Downloading…"
                                        : "Download Resume"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* ────────────── TAB 2: COVER LETTER ────────────── */}
                  {selectedTab === "coverLetter" && (
                    <div className="space-y-4 max-w-3xl">
                      {!selected.coverLetter || !selected.coverLetter.trim() ? (
                        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
                          <Mail
                            size={32}
                            className="mx-auto text-gray-300 mb-2"
                          />
                          <h4 className="text-sm font-bold text-gray-700">
                            No cover letter provided.
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            The candidate submitted this application without an
                            attached cover letter.
                          </p>
                        </div>
                      ) : (
                        (() => {
                          const { subject, paragraphs } = formatCoverLetter(
                            selected.coverLetter
                          );
                          return (
                            <div className="space-y-4">
                              {subject && (
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-800 shadow-2xs">
                                  <FileText
                                    size={13}
                                    className="text-orange-600"
                                  />
                                  <span>Subject: {subject}</span>
                                </div>
                              )}

                              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-4 shadow-2xs">
                                {paragraphs.map((p, idx) => (
                                  <p
                                    key={idx}
                                    className={`text-sm leading-relaxed ${
                                      p.startsWith("Dear ")
                                        ? "font-bold text-gray-900 text-base"
                                        : p.startsWith("Best regards") ||
                                          p.startsWith("Sincerely")
                                        ? "font-semibold text-gray-800 pt-3"
                                        : "text-gray-700 font-normal"
                                    }`}
                                  >
                                    {p}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* ────────── TAB 3: CANDIDATE BACKGROUND ────────── */}
                  {selectedTab === "profile" && (
                    <div className="space-y-6 max-w-3xl">
                      {/* Check if any background information exists */}
                      {!selected.applicant?.skills?.length &&
                      !selected.applicant?.experiences?.length &&
                      !selected.applicant?.qualifications?.length &&
                      !selected.applicant?.projects?.length &&
                      !selected.applicant?.certifications?.length &&
                      !selected.applicant?.bio &&
                      !selected.applicant?.socialLinks?.linkedin &&
                      !selected.applicant?.socialLinks?.website &&
                      !selected.applicant?.socialLinks?.github ? (
                        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/50">
                          <User
                            size={32}
                            className="mx-auto text-gray-300 mb-2"
                          />
                          <h4 className="text-sm font-bold text-gray-700">
                            No candidate background information available.
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            This candidate has not populated skills or background
                            data on their profile yet.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Bio / About */}
                          {selected.applicant?.bio && (
                            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                <User size={13} className="text-orange-600" />
                                <span>About Candidate</span>
                              </h4>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {selected.applicant.bio}
                              </p>
                            </div>
                          )}

                          {/* Social & Web Links */}
                          {(selected.applicant?.socialLinks?.linkedin ||
                            selected.applicant?.socialLinks?.website ||
                            selected.applicant?.socialLinks?.github ||
                            selected.applicant?.socialLinks?.twitter) && (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                                <Globe size={13} className="text-orange-600" />
                                <span>Links & Profiles</span>
                              </h4>
                              <div className="flex flex-wrap gap-2.5">
                                {selected.applicant.socialLinks.linkedin && (
                                  <a
                                    href={selected.applicant.socialLinks.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-blue-700 shadow-2xs transition-colors"
                                  >
                                    <ExternalLink size={12} />
                                    <span>LinkedIn</span>
                                  </a>
                                )}
                                {selected.applicant.socialLinks.website && (
                                  <a
                                    href={selected.applicant.socialLinks.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 shadow-2xs transition-colors"
                                  >
                                    <Globe size={12} />
                                    <span>Portfolio / Website</span>
                                  </a>
                                )}
                                {selected.applicant.socialLinks.github && (
                                  <a
                                    href={selected.applicant.socialLinks.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 shadow-2xs transition-colors"
                                  >
                                    <ExternalLink size={12} />
                                    <span>GitHub</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Skills */}
                          {selected.applicant?.skills &&
                            selected.applicant.skills.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                                  <Sparkles
                                    size={13}
                                    className="text-orange-600"
                                  />
                                  <span>Skills</span>
                                </h4>
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
                              </div>
                            )}

                          {/* Work Experience */}
                          {selected.applicant?.experiences &&
                            selected.applicant.experiences.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                  <Briefcase
                                    size={13}
                                    className="text-orange-600"
                                  />
                                  <span>Experience</span>
                                </h4>
                                <div className="space-y-3">
                                  {selected.applicant.experiences.map(
                                    (exp, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-2xs"
                                      >
                                        <div className="h-9 w-9 rounded-xl bg-orange-100/70 text-orange-600 flex items-center justify-center flex-shrink-0">
                                          <Briefcase size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                              {exp.jobPosition}
                                            </p>
                                            {exp.current && (
                                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex-shrink-0">
                                                Current
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-600 font-medium">
                                            {exp.institution}
                                          </p>
                                          {exp.duration && (
                                            <p className="text-xs text-gray-400 mt-1">
                                              {exp.duration}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Education */}
                          {selected.applicant?.qualifications &&
                            selected.applicant.qualifications.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                  <GraduationCap
                                    size={13}
                                    className="text-orange-600"
                                  />
                                  <span>Education</span>
                                </h4>
                                <div className="space-y-3">
                                  {selected.applicant.qualifications.map(
                                    (q, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-2xs"
                                      >
                                        <div className="h-9 w-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center flex-shrink-0">
                                          <GraduationCap size={16} />
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold text-gray-900">
                                            {q.degree}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {q.institution}
                                            {q.year ? `, ${q.year}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Projects if any */}
                          {selected.applicant?.projects &&
                            selected.applicant.projects.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                  <FileText
                                    size={13}
                                    className="text-orange-600"
                                  />
                                  <span>Projects</span>
                                </h4>
                                <div className="space-y-3">
                                  {selected.applicant.projects.map((proj, i) => (
                                    <div
                                      key={i}
                                      className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-gray-900">
                                          {proj.title}
                                        </p>
                                        {proj.link && (
                                          <a
                                            href={proj.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                                          >
                                            <ExternalLink size={11} /> Link
                                          </a>
                                        )}
                                      </div>
                                      {proj.description && (
                                        <p className="text-xs text-gray-600">
                                          {proj.description}
                                        </p>
                                      )}
                                      {proj.technologies && (
                                        <p className="text-[11px] text-gray-400">
                                          Tech: {proj.technologies}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ────────── TAB 4: INTERVIEW & STAGES ────────── */}
                  {selectedTab === "interview" && (
                    <div className="space-y-5 max-w-2xl">
                      {selected.status === "Interview Scheduled" ? (
                        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                                <Calendar size={18} />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-purple-900">
                                  Interview Scheduled
                                </h4>
                                <p className="text-xs text-purple-700">
                                  Stage: Preliminary Screening
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setInterviewModalFor(selected.applicationId);
                                if (selected.interview?.scheduledAt) {
                                  const d = new Date(
                                    selected.interview.scheduledAt
                                  );
                                  const pad = (n: number) =>
                                    String(n).padStart(2, "0");
                                  setInterviewDate(
                                    `${d.getFullYear()}-${pad(
                                      d.getMonth() + 1
                                    )}-${pad(d.getDate())}T${pad(
                                      d.getHours()
                                    )}:${pad(d.getMinutes())}`
                                  );
                                  setInterviewMode(
                                    selected.interview.mode || "Video Call"
                                  );
                                  setInterviewLink(
                                    selected.interview.meetingLink || ""
                                  );
                                  setInterviewLocation(
                                    selected.interview.location || ""
                                  );
                                  setInterviewNotes(
                                    selected.interview.notes || ""
                                  );
                                }
                              }}
                              className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                            >
                              Reschedule
                            </button>
                          </div>

                          {/* Nepal Time & Date breakdown */}
                          {selected.interview?.scheduledAt &&
                            (() => {
                              const npt = formatNepalDateTime(
                                selected.interview.scheduledAt
                              );
                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 p-4 rounded-xl border border-purple-200/80">
                                  <div>
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase">
                                      Date
                                    </span>
                                    <p className="text-sm font-bold text-purple-950 flex items-center gap-1.5 mt-0.5">
                                      <Calendar
                                        size={14}
                                        className="text-purple-600"
                                      />
                                      {npt.date}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase">
                                      Time
                                    </span>
                                    <p className="text-sm font-bold text-purple-950 flex items-center gap-1.5 mt-0.5">
                                      <Clock
                                        size={14}
                                        className="text-purple-600"
                                      />
                                      {npt.time}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                          {/* Interview Round / Format / Status */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            {selected.interview?.type && (
                              <p className="text-xs text-purple-900">
                                <strong className="font-semibold">Round:</strong>{" "}
                                {selected.interview.type}
                              </p>
                            )}
                            {selected.interview?.mode && (
                              <p className="text-xs text-purple-900">
                                <strong className="font-semibold">Format:</strong>{" "}
                                {selected.interview.mode}
                              </p>
                            )}
                            {selected.interview?.status && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  selected.interview.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : selected.interview.status === "NO_SHOW"
                                    ? "bg-rose-100 text-rose-800"
                                    : selected.interview.status === "CANCELLED"
                                    ? "bg-gray-200 text-gray-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {selected.interview.status}
                              </span>
                            )}
                          </div>

                          {/* Join Interview Meeting Button */}
                          {selected.interview?.meetingLink && (
                            <div className="pt-1">
                              <a
                                href={selected.interview.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
                              >
                                <Video size={15} />
                                <span>Join Interview</span>
                              </a>
                            </div>
                          )}

                          {/* Physical Location */}
                          {selected.interview?.location && (
                            <p className="text-xs text-purple-900 flex items-center gap-1.5">
                              <MapPin size={14} className="text-purple-600" />
                              <span>{selected.interview.location}</span>
                            </p>
                          )}

                          {/* Notes */}
                          {selected.interview?.notes && (
                            <div className="bg-white/90 p-3.5 rounded-xl border border-purple-200/80 text-xs text-purple-950">
                              <strong className="font-semibold text-purple-900 block mb-1">
                                Interview Notes:
                              </strong>
                              {selected.interview.notes}
                            </div>
                          )}

                          {/* Email Notification Status & Resend Button */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-purple-200/70">
                            <div className="flex items-center gap-2 text-xs">
                              <Mail
                                size={14}
                                className="text-purple-600 shrink-0"
                              />
                              <span className="text-purple-900 font-medium">
                                Email Notification:
                              </span>
                              {selected.interview?.emailStatus === "sent" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 size={11} /> Email Sent
                                </span>
                              ) : selected.interview?.emailStatus ===
                                "failed" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertCircle size={11} /> Delivery Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                                  Pending Delivery
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={resendingEmail}
                              onClick={() =>
                                handleResendEmail(selected.applicationId)
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 hover:text-purple-950 bg-white hover:bg-purple-100/80 border border-purple-200 rounded-xl transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCcw
                                size={12}
                                className={resendingEmail ? "animate-spin" : ""}
                              />
                              <span>
                                {resendingEmail ? "Sending…" : "Resend Email"}
                              </span>
                            </button>
                          </div>

                          {/* Outcome: mark completed / no-show (spec section 20) */}
                          {!["COMPLETED", "NO_SHOW", "CANCELLED"].includes(selected.interview?.status || "") && (
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                type="button"
                                disabled={outcomeLoading}
                                onClick={() => handleMarkOutcome(selected.applicationId, "COMPLETED")}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                              >
                                <CheckCircle2 size={13} /> Mark Completed
                              </button>
                              <button
                                type="button"
                                disabled={outcomeLoading}
                                onClick={() => handleMarkOutcome(selected.applicationId, "NO_SHOW")}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                              >
                                <UserX size={13} /> Mark No-Show
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-8 sm:p-10 text-center space-y-3">
                          <Calendar
                            size={32}
                            className="mx-auto text-gray-400"
                          />
                          <h4 className="text-sm font-bold text-gray-800">
                            No interview scheduled.
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                            Move this candidate forward by setting up a video meeting, phone screening, or in-person interview.
                          </p>
                          <button
                            onClick={() => {
                              setInterviewModalFor(selected.applicationId);
                              setInterviewDate("");
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Calendar size={14} />
                            <span>Schedule Interview</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right / Action Section (Desktop Sidebar) ── */}
            <div className="hidden lg:block lg:col-span-4 space-y-5 lg:sticky lg:top-4">
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
                  Application Actions
                </h3>

                {/* Status Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Application Status
                  </label>
                  <div className="relative">
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        handleStatusChange(
                          selected.applicationId,
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-white text-gray-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer appearance-none pr-8"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                {/* Primary & Secondary Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setInterviewModalFor(selected.applicationId);
                      setInterviewDate("");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-xs font-semibold shadow-xs hover:shadow-md active:scale-98 transition-all cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #EA580C)",
                    }}
                  >
                    <Calendar size={15} />
                    <span>
                      {selected.status === "Interview Scheduled"
                        ? "Reschedule Interview"
                        : "Schedule Interview"}
                    </span>
                  </button>

                  {selected.status === "Interview Scheduled" && (
                    <button
                      onClick={() => setCancelModalFor(selected.applicationId)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Ban size={15} />
                      <span>Cancel Interview</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      handleMessageCandidate(selected.applicant?._id)
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <MessageSquare size={15} className="text-orange-600" />
                    <span>Message Candidate</span>
                  </button>

                  <button
                    onClick={() => setMessageModalFor(selected.applicationId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Send size={15} className="text-orange-600" />
                    <span>Send Message</span>
                  </button>

                  <button
                    onClick={() => setAssessmentModalFor(selected.applicationId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <ClipboardCheck size={15} className="text-orange-600" />
                    <span>
                      {selected.assessment?.assessment ? "Reassign Assessment" : "Assign Assessment"}
                    </span>
                  </button>

                  {selected.assessment?.status &&
                    ["submitted", "evaluated"].includes(selected.assessment.status) && (
                      <button
                        onClick={() => setResultsModalFor(selected.applicationId)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Award size={15} className="text-orange-600" />
                        <span>View Assessment Results</span>
                      </button>
                    )}

                  {selected.resume &&
                    !isUnrecoverableResumePath(selected.resume) && (
                      <button
                        onClick={() => handleDownloadResume(selected)}
                        disabled={downloadingResume}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Download size={15} className="text-gray-500" />
                        <span>
                          {downloadingResume
                            ? "Downloading Resume…"
                            : "Download Resume"}
                        </span>
                      </button>
                    )}
                </div>

                {/* Candidate Quick Facts */}
                <div className="pt-3 border-t border-gray-100 text-xs space-y-2 text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Applied Date</span>
                    <strong className="text-gray-800 font-semibold">
                      {formatDate(selected.appliedAt)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target Job</span>
                    <span className="text-gray-800 font-medium truncate max-w-[170px] text-right">
                      {selected.job?.title || "Removed"}
                    </span>
                  </div>
                  {selected.howDidYouHear && (
                    <div className="flex items-center justify-between">
                      <span>Source</span>
                      <strong className="text-gray-800 font-semibold">
                        {selected.howDidYouHear}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MAIN APPLICATION LIST VIEW (Table on Tablet/Desktop, Cards on Mobile)
        ───────────────────────────────────────────────────────────── */
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Page Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Applications
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalApplications} application
                {totalApplications !== 1 ? "s" : ""} across your job listings
              </p>
            </div>

            {/* Clickable Status Summary Filter Strip */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filters">
              {STATUS_OPTIONS.map((s) => {
                const isSelected = statusFilter === s;
                const count = statusCounts[s] ?? 0;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(isSelected ? "" : s)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? `${statusConfig[s].bg} ${statusConfig[s].text} ring-2 ring-orange-500/40 border border-transparent shadow-xs`
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-2xs"
                    }`}
                    title={`Filter by ${s}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${statusConfig[s].dot}`}
                    />
                    <span>{s}</span>
                    <span
                      className={`font-bold ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] ${
                        isSelected ? "bg-white/80" : "bg-gray-100"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by candidate name or job title…"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                />
              </div>

              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer shadow-2xs ${
                  showFilters || activeFilterCount > 0
                    ? "border-orange-500/40 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter size={14} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 ml-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {(activeFilterCount > 0 || search) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Expanded Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 shadow-2xs animate-fade-in">
                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Job
                  </label>
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="">All jobs</option>
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Applied after
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                  </input>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Applied before
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* List Content: Error, Loading, Empty, or Data */}
          {error ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center shadow-2xs">
              <AlertCircle size={32} className="mx-auto text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-rose-700">
                Unable to load candidate applications.
              </p>
              <button
                onClick={() => fetchApplicants()}
                className="mt-3 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-2xs">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-36 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-52 animate-pulse rounded bg-gray-100" />
                    </div>
                    <div className="h-7 w-24 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-8 w-20 animate-pulse rounded-xl bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center shadow-2xs">
              <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 text-orange-600">
                <Briefcase size={24} />
              </div>
              <p className="text-base font-bold text-gray-800">
                {activeFilterCount > 0 || search
                  ? "No applications match these filters"
                  : "No applicants yet"}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                {activeFilterCount > 0 || search
                  ? "Try adjusting your search criteria or resetting filters."
                  : "Applications will show up here once candidates apply to your job listings."}
              </p>
              {(activeFilterCount > 0 || search) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table (md and up) */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <User size={13} /> Candidate
                          </div>
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={13} /> Job Title
                          </div>
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} /> Applied
                          </div>
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                          Status
                        </th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {applications.map((applicant) => (
                        <tr
                          key={applicant.applicationId}
                          onClick={() => setSelected(applicant)}
                          className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={applicant.applicant?.name}
                                photo={applicant.applicant?.profilePic}
                                size={10}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                  {applicant.applicant?.name || (
                                    <span className="italic text-gray-400">
                                      No name
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {applicant.applicant?.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-gray-800">
                              {applicant.job?.title || (
                                <span className="italic text-gray-400">
                                  Job removed
                                </span>
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm text-gray-500">
                              {formatDate(applicant.appliedAt)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={applicant.status} />
                          </td>

                          <td
                            className="px-5 py-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelected(applicant)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
                              title="Review candidate profile and application"
                            >
                              <Eye size={13} />
                              <span>Review</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Desktop Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/60">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-gray-500">
                    Page{" "}
                    <strong className="text-gray-900 font-bold">{page}</strong>{" "}
                    of {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Mobile Responsive Cards (visible strictly on < md) */}
              <div className="md:hidden space-y-3">
                {applications.map((applicant) => (
                  <div
                    key={applicant.applicationId}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 space-y-3"
                  >
                    {/* Top Row: Avatar + Name + Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          name={applicant.applicant?.name}
                          photo={applicant.applicant?.profilePic}
                          size={10}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {applicant.applicant?.name || "Applicant"}
                          </p>
                          <p className="text-xs text-gray-500 font-medium truncate">
                            {applicant.job?.title || "Job removed"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={applicant.status} />
                    </div>

                    {/* Meta Row: Email & Applied Date */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                      <span>Applied: {formatDate(applicant.appliedAt)}</span>
                      {applicant.resume &&
                        !isUnrecoverableResumePath(applicant.resume) && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FileText size={10} /> PDF
                          </span>
                        )}
                    </div>

                    {/* Full-width Touch Review Button */}
                    <button
                      onClick={() => setSelected(applicant)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-100 transition-colors shadow-2xs cursor-pointer active:scale-98"
                    >
                      <Eye size={14} />
                      <span>Review</span>
                    </button>
                  </div>
                ))}

                {/* Mobile Pagination */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCHEDULE INTERVIEW MODAL (Fully Responsive, z-[100])
      ───────────────────────────────────────────────────────────── */}
      {interviewModalFor &&
        (() => {
          const modalApp =
            applications.find((a) => a.applicationId === interviewModalFor) ||
            (selected?.applicationId === interviewModalFor ? selected : null);
          return (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 my-auto flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gradient-to-r from-orange-50/60 to-amber-50/40 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={modalApp?.applicant?.name}
                      photo={modalApp?.applicant?.profilePic}
                      size={10}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-gray-900">
                          Schedule Interview
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        Candidate:{" "}
                        <strong className="text-gray-800 font-semibold">
                          {modalApp?.applicant?.name || "Candidate"}
                        </strong>
                        {modalApp?.job?.title ? ` • ${modalApp.job.title}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInterviewModalFor(null)}
                    className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                    title="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Interview Round (spec: Technical/HR/Final/Phone/Video/In-person) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Interview Round (optional)
                    </label>
                    <select
                      value={interviewType}
                      onChange={(e) => setInterviewType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                    >
                      <option value="">Not specified</option>
                      <option value="Technical Interview">Technical Interview</option>
                      <option value="HR Interview">HR Interview</option>
                      <option value="Final Interview">Final Interview</option>
                      <option value="Phone Interview">Phone Interview</option>
                      <option value="Video Interview">Video Interview</option>
                      <option value="In-person Interview">In-person Interview</option>
                    </select>
                  </div>

                  {/* Interview Mode Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          mode: "Video Call",
                          icon: Video,
                          label: "Video Call",
                        },
                        {
                          mode: "Phone Call",
                          icon: Phone,
                          label: "Phone Call",
                        },
                        {
                          mode: "In-Person",
                          icon: Building2,
                          label: "In-Person",
                        },
                      ].map(({ mode, icon: Icon, label }) => {
                        const isSelected = interviewMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setInterviewMode(mode)}
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "border-orange-500 bg-orange-50 text-orange-700 shadow-2xs ring-1 ring-orange-400/30"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <Icon
                              size={15}
                              className={
                                isSelected ? "text-orange-600" : "text-gray-400"
                              }
                            />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Time with Quick Shortcut Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Date & Time
                      </label>
                      <span className="text-[11px] text-gray-400">
                        Local device time
                      </span>
                    </div>
                    <input
                      type="datetime-local"
                      min={new Date().toISOString().slice(0, 16)}
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                    />

                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-gray-400 mr-1 flex items-center gap-1">
                        <Clock size={11} /> Quick:
                      </span>
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

                  {/* Mode-specific Location or Link input */}
                  {interviewMode === "In-Person" ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                        Office / Interview Location
                      </label>
                      <div className="relative">
                        <MapPin
                          size={15}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={interviewLocation}
                          onChange={(e) =>
                            setInterviewLocation(e.target.value)
                          }
                          placeholder="e.g. Kathmandu Head Office, 3rd Floor Conference Room"
                          className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          {interviewMode === "Video Call"
                            ? "Meeting Link"
                            : "Phone Number"}
                        </label>
                        {interviewMode === "Video Call" && (
                          <button
                            type="button"
                            onClick={() =>
                              setInterviewLink("https://meet.google.com/new")
                            }
                            className="text-[11px] text-orange-600 hover:text-orange-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Link2 size={11} /> Create Google Meet
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        {interviewMode === "Video Call" ? (
                          <Video
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                          />
                        ) : (
                          <Phone
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                          />
                        )}
                        <input
                          type="text"
                          value={interviewLink}
                          onChange={(e) => setInterviewLink(e.target.value)}
                          placeholder={
                            interviewMode === "Video Call"
                              ? "https://meet.google.com/… or Zoom link"
                              : modalApp?.applicant?.email
                              ? `Contact candidate via ${modalApp.applicant.email}`
                              : "+977-… or candidate phone"
                          }
                          className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes / Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Interview Notes / Candidate Instructions
                    </label>
                    <textarea
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Please bring your portfolio and prepare for a 20-minute technical review."
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors resize-none"
                    />
                  </div>

                  {/* Custom message to candidate (spec: employer can add a
                      personal note, inserted into the email alongside the
                      standard template). */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Custom message to candidate (optional)
                    </label>
                    <textarea
                      value={interviewCustomMessage}
                      onChange={(e) => setInterviewCustomMessage(e.target.value)}
                      rows={2}
                      placeholder="e.g. Looking forward to speaking with you!"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors resize-none"
                    />
                  </div>

                  {/* Candidate Notification Reassurance */}
                  <div className="flex items-start gap-2.5 rounded-xl bg-orange-50 border border-orange-200/70 p-3 text-xs text-orange-900">
                    <Mail
                      size={15}
                      className="text-orange-600 flex-shrink-0 mt-0.5"
                    />
                    <span>
                      An automated invitation and confirmation email will be
                      sent to{" "}
                      <strong className="font-semibold text-orange-950">
                        {modalApp?.applicant?.email || "the candidate"}
                      </strong>
                      .
                    </span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setInterviewModalFor(null)}
                    className="border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!interviewDate}
                    onClick={() => setShowInterviewPreview(true)}
                    className="flex items-center gap-1.5 border border-orange-200 bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleScheduleInterview}
                    disabled={schedulingLoading || !interviewDate}
                    className="flex-1 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #EA580C)",
                    }}
                  >
                    {schedulingLoading ? (
                      <span>Scheduling…</span>
                    ) : (
                      <>
                        <Calendar size={15} />
                        <span>Schedule Interview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showInterviewPreview && interviewDate && (
                <EmailPreviewModal
                  onClose={() => setShowInterviewPreview(false)}
                  sendLabel="Schedule & Send"
                  fetchPreview={() =>
                    previewApplicationEmail(interviewModalFor, {
                      action:
                        modalApp?.status === "Interview Scheduled" ? "reschedule_interview" : "schedule_interview",
                      customMessage: interviewCustomMessage.trim() || undefined,
                      interview: {
                        scheduledAt: new Date(interviewDate).toISOString(),
                        mode: interviewMode,
                        type: (interviewType || undefined) as InterviewType | undefined,
                        meetingLink: interviewLink,
                        location: interviewLocation,
                        notes: interviewNotes,
                      },
                    })
                  }
                  onConfirmSend={handleScheduleInterview}
                />
              )}
            </div>
          );
        })()}

      {/* ─────────────────────────────────────────────────────────────
          CANCEL INTERVIEW MODAL (spec section 19)
      ───────────────────────────────────────────────────────────── */}
      {cancelModalFor &&
        (() => {
          const modalApp =
            applications.find((a) => a.applicationId === cancelModalFor) ||
            (selected?.applicationId === cancelModalFor ? selected : null);
          return (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 my-auto flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <Ban size={18} className="text-rose-600" /> Cancel Interview
                  </h2>
                  <button
                    onClick={() => setCancelModalFor(null)}
                    className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
                  <p className="text-xs text-gray-500">
                    Candidate: <strong className="text-gray-800">{modalApp?.applicant?.name || "Candidate"}</strong>
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason (included in the cancellation email)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      placeholder="e.g. The role's requirements have changed."
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Move application to</label>
                    <select
                      value={cancelTargetStatus}
                      onChange={(e) => setCancelTargetStatus(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="Shortlisted">Shortlisted (keep in pipeline)</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <button
                    onClick={() => setCancelModalFor(null)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowCancelPreview(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    onClick={handleCancelInterview}
                    disabled={cancelling}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
                  >
                    {cancelling ? "Cancelling…" : "Cancel Interview"}
                  </button>
                </div>
              </div>

              {showCancelPreview && (
                <EmailPreviewModal
                  onClose={() => setShowCancelPreview(false)}
                  sendLabel="Cancel & Send"
                  fetchPreview={() =>
                    previewApplicationEmail(cancelModalFor, {
                      action: "cancel_interview",
                      cancellationReason: cancelReason.trim() || undefined,
                    })
                  }
                  onConfirmSend={handleCancelInterview}
                />
              )}
            </div>
          );
        })()}

      {/* ─────────────────────────────────────────────────────────────
          SEND MESSAGE MODAL (spec section 22 — standalone one-off note,
          distinct from the full Conversation/Message system)
      ───────────────────────────────────────────────────────────── */}
      {messageModalFor &&
        (() => {
          const modalApp =
            applications.find((a) => a.applicationId === messageModalFor) ||
            (selected?.applicationId === messageModalFor ? selected : null);
          return (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 my-auto flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <Send size={18} className="text-orange-600" /> Send a Message
                  </h2>
                  <button
                    onClick={() => setMessageModalFor(null)}
                    className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto flex-1 text-sm">
                  <p className="text-xs text-gray-500">
                    To: <strong className="text-gray-800">{modalApp?.applicant?.name || "Candidate"}</strong>
                    {modalApp?.applicant?.email ? ` (${modalApp.applicant.email})` : ""}
                  </p>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={5}
                    placeholder="Write a message for this candidate…"
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <p className="text-[11px] text-gray-400">
                    Sent as an in-app notification and a one-off email. For an ongoing conversation, use "Message Candidate" instead.
                  </p>
                </div>
                <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <button
                    onClick={() => setMessageModalFor(null)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !messageText.trim()}
                    className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {sendingMessage ? "Sending…" : "Send Message"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {resultsModalFor &&
        (() => {
          const modalApp =
            applications.find((a) => a.applicationId === resultsModalFor) ||
            (selected?.applicationId === resultsModalFor ? selected : null);
          if (!modalApp?.assessment?.assessment) return null;
          return (
            <AssessmentResultsModal
              assessmentId={modalApp.assessment.assessment}
              applicationId={resultsModalFor}
              onClose={() => setResultsModalFor(null)}
            />
          );
        })()}

      {assessmentModalFor &&
        (() => {
          const modalApp =
            applications.find((a) => a.applicationId === assessmentModalFor) ||
            (selected?.applicationId === assessmentModalFor ? selected : null);
          if (!modalApp?.job?._id) return null;
          return (
            <AssignAssessmentModal
              jobId={modalApp.job._id}
              applicationId={assessmentModalFor}
              candidateEmail={modalApp.applicant?.email}
              onClose={() => setAssessmentModalFor(null)}
              onAssigned={fetchApplicants}
            />
          );
        })()}
    </div>
  );
};

export default Applicants;
