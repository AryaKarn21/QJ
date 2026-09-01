import { useNavigate } from "react-router-dom";
import {
  MapPin, Clock, Bell, MessageCircle, Briefcase,
  FileText, CheckCircle, XCircle, Eye, Send,
  TrendingUp, ChevronRight, Loader2,
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

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Accepted:  { bg: "bg-green-50 text-green-700 border border-green-200",  text: "Accepted",  icon: <CheckCircle size={11} /> },
  Rejected:  { bg: "bg-red-50 text-red-700 border border-red-200",        text: "Rejected",  icon: <XCircle size={11} /> },
  Reviewed:  { bg: "bg-yellow-50 text-yellow-700 border border-yellow-200", text: "Reviewed", icon: <Eye size={11} /> },
  Pending:   { bg: "bg-gray-50 text-gray-600 border border-gray-200",      text: "Pending",  icon: <Clock size={11} /> },
};

const UserDashboard = () => {
  const navigate = useNavigate();

  const { data: appliedJobs = [], isLoading: loadingJobs } = useQuery({
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

  const { data: dashboardStats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
  });

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery<JobseekerNotification[]>({
    queryKey: ["jobseekerNotifications"],
    queryFn: getJobseekerNotifications,
  });

  const { data: conversations = [], isLoading: loadingMessages } = useQuery<ConversationSummary[]>({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  const statCards = dashboardStats
    ? [
        { label: "Total Applications", value: dashboardStats.totalApplications, icon: <FileText size={20} />, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Pending",            value: dashboardStats.pending,            icon: <Clock size={20} />,    color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Reviewed",           value: dashboardStats.reviewed,           icon: <Eye size={20} />,      color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Accepted",           value: dashboardStats.accepted,           icon: <CheckCircle size={20} />, color: "text-green-600", bg: "bg-green-50" },
        { label: "Rejected",           value: dashboardStats.rejected,           icon: <XCircle size={20} />,  color: "text-red-600", bg: "bg-red-50" },
      ]
    : [];

  const unreadMessages = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const recentMessages = conversations.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-auto" style={{ maxHeight: "calc(100vh - 50px)" }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Welcome bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track your applications, messages, and activity</p>
          </div>
          <button onClick={() => navigate("/jobs")}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <TrendingUp size={15} /> Browse Jobs
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {loadingStats
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse h-24" />
              ))
            : statCards.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${s.color}`}>{s.label}</p>
                </div>
              ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Applied Jobs — 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                <h2 className="font-bold text-gray-900">Applied Jobs</h2>
              </div>
              <button onClick={() => navigate("/user/applications")}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ChevronRight size={13} />
              </button>
            </div>

            {loadingJobs ? (
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
                  <h2 className="font-bold text-gray-900 text-sm">Messages</h2>
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

              {loadingMessages ? (
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
                <h2 className="font-bold text-gray-900 text-sm">Notifications</h2>
              </div>

              {loadingNotifications ? (
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
                    const getId = (ref: any) => typeof ref === "string" ? ref : ref?._id;
                    const jobId = getId(note.relatedJob);
                    const appId = getId(note.relatedApplication);
                    const link = jobId ? `/jobs/${jobId}` : appId ? `/applications/${appId}` : null;
                    const isMessage = note.message?.toLowerCase().includes("message");

                    return (
                      <li key={note._id}>
                        <button
                          onClick={() => link && navigate(link)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all ${link ? "hover:bg-gray-50 cursor-pointer border-gray-100" : "cursor-default border-transparent"}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">
                              {isMessage ? "💬" : note.message?.includes("accept") ? "✅" : note.message?.includes("reject") ? "❌" : note.message?.includes("interview") ? "📅" : "🔔"}
                            </span>
                            <div>
                              <p className={`text-xs leading-snug ${link ? "text-blue-700 font-medium" : "text-gray-700"}`}>
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