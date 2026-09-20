import { useNavigate } from "react-router-dom";
import {
  MapPin, Clock, Bell, MessageCircle, Briefcase,
  FileText, CheckCircle, XCircle, Eye, Send,
  TrendingUp, ChevronRight, Loader2, CalendarClock,
  Search, ClipboardList, Bookmark, History, Sparkles,
  Users, BookOpen, Lightbulb, CreditCard, LifeBuoy,
  UserCircle, Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAppliedJobs,
  fetchDashboardStats,
  getJobseekerNotifications,
  JobseekerNotification,
} from "../jobseekerApi/api";
import { fetchConversations } from "../../../api/messageApi";
import type { ConversationSummary } from "../../../types/community";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

function avatarUrl(pic?: string | null) {
  if (!pic) return "";
  return `${MEDIA_URL.replace(/\/$/, "")}/${pic.replace(/^\//, "")}`;
}

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

interface AppliedJob {
  _id: string;
  title: string;
  location: string;
  type: string;
  applicationStatus: string;
  appliedAt: string;
}

interface QuickAccessModule {
  icon: React.ReactNode;
  label: string;
  description: string;
  path: string;
}

const QUICK_ACCESS_MODULES: QuickAccessModule[] = [
  { icon: <Search size={20} />, label: "Browse Jobs", description: "Find your next opportunity", path: "/jobs" },
  { icon: <ClipboardList size={20} />, label: "My Applications", description: "Track jobs you've applied to", path: "/user/applications" },
  { icon: <Bookmark size={20} />, label: "Saved Jobs", description: "Jobs you bookmarked", path: "/user/savedjobs" },
  { icon: <FileText size={20} />, label: "Resume Builder", description: "Create a professional resume", path: "/resume" },
  { icon: <History size={20} />, label: "My Resumes", description: "View your saved resumes", path: "/resume/history" },
  { icon: <Sparkles size={20} />, label: "AI Resume Builder", description: "Build your resume with AI", path: "/resume/ai-builder" },
  { icon: <MessageCircle size={20} />, label: "Messages", description: "Chat with employers", path: "/messages" },
  { icon: <Users size={20} />, label: "Community", description: "Connect with professionals", path: "/community" },
  { icon: <BookOpen size={20} />, label: "Blog", description: "Read career insights", path: "/blog" },
  { icon: <Lightbulb size={20} />, label: "Career Tips", description: "Expert advice for job seekers", path: "/career-tips" },
  { icon: <CreditCard size={20} />, label: "Subscription", description: "Manage your plan", path: "/user/subscription" },
  { icon: <LifeBuoy size={20} />, label: "Support", description: "Get help with your account", path: "/user/support" },
  { icon: <UserCircle size={20} />, label: "My Profile", description: "Edit your public profile", path: "/user/profile" },
  { icon: <Settings size={20} />, label: "Settings", description: "Account preferences", path: "/user/settings" },
];

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Accepted:             { bg: "bg-green-50 text-green-700 border border-green-200",   text: "Accepted",  icon: <CheckCircle size={11} /> },
  Rejected:             { bg: "bg-red-50 text-red-700 border border-red-200",         text: "Rejected",  icon: <XCircle size={11} /> },
  Reviewed:             { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", text: "Reviewed", icon: <Eye size={11} /> },
  Pending:              { bg: "bg-gray-50 text-gray-600 border border-gray-200",       text: "Pending",  icon: <Clock size={11} /> },
  "Interview Scheduled": { bg: "bg-purple-50 text-purple-700 border border-purple-200", text: "Interview Scheduled", icon: <CalendarClock size={11} /> },
};

const UserDashboard = () => {
  const navigate = useNavigate();

  const { data: appliedJobs = [], isLoading: loadingJobs, isFetching: fetchingJobs, refetch: refetchAppliedJobs } = useQuery({
    queryKey: ["appliedJobs"],
    queryFn: fetchAppliedJobs,
    select: (jobs: any[]): AppliedJob[] =>
      jobs.map((job: any) => ({
        _id: job._id,
        title: job.title,
        location: job.location,
        type: job.jobtype || "Full Time",
        applicationStatus: job.applicationStatus || "Pending",
        appliedAt: job.appliedAt || "",
      })),
  });

  const { data: dashboardStats, isLoading: loadingStats, isFetching: fetchingStats, refetch: refetchDashboardStats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
  });

  const { data: notifications = [], isLoading: loadingNotifications, isFetching: fetchingNotifications, refetch: refetchNotifications } = useQuery<JobseekerNotification[]>({
    queryKey: ["jobseekerNotifications"],
    queryFn: getJobseekerNotifications,
  });

  const { data: conversations = [], isLoading: loadingMessages, isFetching: fetchingMessages, refetch: refetchConversations } = useQuery<ConversationSummary[]>({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  useAutoRefresh(() => {
    refetchAppliedJobs();
    refetchDashboardStats();
    refetchNotifications();
    refetchConversations();
  }, 30000);

  const statCards = dashboardStats
    ? [
        { label: "Total Applications", value: dashboardStats.totalApplications, icon: <FileText size={20} />, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Pending",            value: dashboardStats.pending,            icon: <Clock size={20} />,    color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Reviewed",           value: dashboardStats.reviewed,           icon: <Eye size={20} />,      color: "text-purple-600", bg: "bg-purple-50" },
        // Was missing entirely — an application that had its interview
        // scheduled fell out of every bucket below (see
        // jobseekerController.js's getDashboardStats fix) while everything
        // else on the page kept saying "0". Now it has its own home.
        { label: "Interview Scheduled", value: dashboardStats.interviewScheduled, icon: <CalendarClock size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Accepted",           value: dashboardStats.accepted,           icon: <CheckCircle size={20} />, color: "text-green-600", bg: "bg-green-50" },
        { label: "Rejected",           value: dashboardStats.rejected,           icon: <XCircle size={20} />,  color: "text-red-600", bg: "bg-red-50" },
      ]
    : [];

  const unreadMessages = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const recentMessages = conversations.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#FFF8F3] p-6 overflow-auto" style={{ maxHeight: "calc(100dvh - 50px)" }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Welcome bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {dashboardStats && "name" in dashboardStats && (dashboardStats as { name?: string }).name
                ? `Welcome back, ${(dashboardStats as { name?: string }).name}`
                : "My Dashboard"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Track your applications, messages, and activity</p>
          </div>
          <button onClick={() => navigate("/jobs")}
            className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F97316]/90 transition-colors shadow-sm">
            <TrendingUp size={15} /> Browse Jobs
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {(loadingStats || fetchingStats)
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-24" />
              ))
            : statCards.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${s.color}`}>{s.label}</p>
                </div>
              ))}
        </div>

        {/* ── Quick Access ── */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {QUICK_ACCESS_MODULES.map((mod) => (
              <button
                key={mod.path}
                type="button"
                onClick={() => navigate(mod.path)}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm cursor-pointer text-left hover:shadow-md hover:border-orange-200 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mb-2.5">
                  {mod.icon}
                </div>
                <p className="text-sm font-semibold text-gray-900">{mod.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{mod.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Applied Jobs — 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Applied Jobs</h2>
                <span className="text-xs text-gray-400">({appliedJobs.length})</span>
              </div>
              <button onClick={() => navigate("/user/applications")}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ChevronRight size={13} />
              </button>
            </div>

            {(loadingJobs || fetchingJobs) ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : appliedJobs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <FileText size={24} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No applications yet</p>
                <p className="text-xs text-gray-400 mt-1">Start applying to jobs to track them here.</p>
                <button onClick={() => navigate("/jobs")}
                  className="mt-4 text-sm text-primary font-semibold hover:underline">Browse Jobs →</button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {appliedJobs.map((job) => {
                  const s = statusConfig[job.applicationStatus] || statusConfig.Pending;
                  return (
                    <div key={job._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-all group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 truncate">{job.title}</p>
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg}`}>
                            {s.icon} {s.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1"><MapPin size={11} /> {job.location}</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {job.type}</span>
                          {job.appliedAt && <span>{relativeTime(job.appliedAt)}</span>}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/jobs/${job._id}`)}
                        className="ml-3 flex-shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity">
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column — Messages + Notifications */}
          <div className="space-y-6">

            {/* ── Recent Messages ── */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle size={17} className="text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Messages</h2>
                  {unreadMessages > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <button onClick={() => navigate("/messages")}
                  className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5">
                  Open <ChevronRight size={12} />
                </button>
              </div>

              {(loadingMessages || fetchingMessages) ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-2/3" />
                        <div className="h-2 bg-gray-100 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-6">
                  <Send size={20} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMessages.map((conv) => (
                    <button key={conv._id} onClick={() => navigate(`/messages/${conv._id}`)}
                      className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors text-left">
                      <div className="relative flex-shrink-0">
                        {conv.otherUser.avatar ? (
                          <img src={avatarUrl(conv.otherUser.avatar)} alt={conv.otherUser.name}
                            className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                            {conv.otherUser.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                            {conv.otherUser.name}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ml-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] truncate ${conv.unreadCount > 0 ? "text-gray-700" : "text-gray-400"}`}>
                          {conv.lastMessage?.text || "Say hello 👋"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Recent Notifications ── */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={17} className="text-orange-500" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Notifications</h2>
              </div>

              {(loadingNotifications || fetchingNotifications) ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-6">
                  <Bell size={20} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No notifications yet</p>
                </div>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.slice(0, 8).map((note) => {
                    // Helper — works whether the ref was populated (object)
                    // or left as a raw string ID.
                    const getId = (ref: any): string | null =>
                      !ref ? null : typeof ref === "string" ? ref : ref?._id ?? null;

                    const jobId  = getId(note.relatedJob);
                    const convId = getId(note.relatedConversation);
                    const postId = getId(note.relatedPost);

                    // Priority:
                    // 1. `link` — pre-computed deep-link stored by the backend.
                    // 2. `type` — map the notification type to the correct route.
                    // 3. relatedJob fallback for legacy notifications.
                    const resolvedLink: string | null =
                      note.link ||
                      (() => {
                        switch (note.type) {
                          case "new_message":
                            return convId ? `/messages/${convId}` : "/messages";
                          case "application_update":
                          case "job_application":
                          case "job_status_update":
                            return "/user/applications";
                          case "post_like":
                          case "post_comment":
                          case "post_mention":
                          case "comment_reply":
                          case "comment_like":
                          case "post_share":
                            return postId ? `/community/post/${postId}` : "/community";
                          case "new_follower":
                          case "connection_request":
                          case "connection_accepted":
                            return "/community";
                          case "subscription_activated":
                            return "/user/subscription";
                          case "support_ticket_reply":
                            return "/user/support";
                          case "job_approved":
                          case "job_rejected":
                          case "job_post":
                            return jobId ? `/jobs/${jobId}` : "/jobs";
                          default:
                            return jobId ? `/jobs/${jobId}` : null;
                        }
                      })();

                    const emoji =
                      note.type === "new_message"                          ? "💬"
                      : note.type === "application_update"
                        || note.type === "job_application"
                        || note.type === "job_status_update"               ? "📋"
                      : note.type === "post_like"
                        || note.type === "comment_like"                    ? "❤️"
                      : note.type === "post_comment"
                        || note.type === "comment_reply"                   ? "💬"
                      : note.type === "new_follower"                       ? "👤"
                      : note.type === "connection_request"
                        || note.type === "connection_accepted"             ? "🤝"
                      : note.type === "subscription_activated"             ? "⭐"
                      : note.type === "support_ticket_reply"               ? "🎫"
                      : note.type === "general_announcement"               ? "📢"
                      : note.message?.toLowerCase().includes("accept")     ? "✅"
                      : note.message?.toLowerCase().includes("reject")     ? "❌"
                      : note.message?.toLowerCase().includes("interview")  ? "📅"
                      : "🔔";

                    return (
                      <li key={note._id}>
                        <button
                          onClick={() => resolvedLink && navigate(resolvedLink)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                            resolvedLink
                              ? "hover:bg-gray-50 cursor-pointer border-gray-100"
                              : "cursor-default border-transparent"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">{emoji}</span>
                            <div>
                              <p className={`text-xs leading-snug ${resolvedLink ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                                {note.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;