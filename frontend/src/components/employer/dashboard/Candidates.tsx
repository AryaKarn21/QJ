import { useEffect, useState } from "react";
import { getCandidates, toggleSavedCandidate, updateApplicationStatus } from "../employerApi/api";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { Bookmark, BookmarkCheck, Pencil, Calendar, Search, Users } from "lucide-react";
import { toast } from "react-toastify";

interface Candidate {
    candidateId: string;
    name: string;
    email: string;
    profilePic?: string;
    latestJobTitle?: string;
    latestStatus: string;
    latestApplicationId: string;
    totalApplications: number;
    isSaved: boolean;
}

const STATUS_OPTIONS = ["Pending", "Reviewed", "Interview Scheduled", "Accepted", "Rejected"];

const statusColor: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Reviewed: "bg-blue-100 text-blue-700",
    Accepted: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
    "Interview Scheduled": "bg-purple-100 text-purple-700",
};

const Candidates = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    // Search + career status filter — client-side only, over the already
    // fetched candidate list (no extra API calls).
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Status dropdown open for this candidate's applicationId
    const [editingStatusFor, setEditingStatusFor] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Interview scheduling modal, keyed by applicationId
    const [interviewModalFor, setInterviewModalFor] = useState<string | null>(null);
    const [interviewDate, setInterviewDate] = useState("");
    const [interviewMode, setInterviewMode] = useState("Video Call");
    const [interviewLink, setInterviewLink] = useState("");
    const [interviewLocation, setInterviewLocation] = useState("");
    const [interviewNotes, setInterviewNotes] = useState("");
    const [scheduling, setScheduling] = useState(false);

    useEffect(() => {
        getCandidates()
            .then(setCandidates)
            .catch((err) => {
                console.error("Failed to load candidates:", err);
                toast.error("Failed to load candidates.");
            })
            .finally(() => setLoading(false));
    }, []);

    const handleToggleSave = async (candidateId: string) => {
        setSavingId(candidateId);
        try {
            const saved = await toggleSavedCandidate(candidateId);
            setCandidates((prev) =>
                prev.map((c) => (c.candidateId === candidateId ? { ...c, isSaved: saved } : c))
            );
            toast.success(saved ? "Candidate saved." : "Removed from saved candidates.");
        } catch (err) {
            console.error("Failed to toggle saved candidate:", err);
            toast.error("Something went wrong.");
        } finally {
            setSavingId(null);
        }
    };

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        if (newStatus === "Interview Scheduled") {
            setInterviewModalFor(applicationId);
            setEditingStatusFor(null);
            return;
        }
        setUpdatingStatus(true);
        try {
            await updateApplicationStatus(applicationId, newStatus);
            setCandidates((prev) =>
                prev.map((c) =>
                    c.latestApplicationId === applicationId ? { ...c, latestStatus: newStatus } : c
                )
            );
            toast.success(`Status updated to "${newStatus}". Candidate notified by email.`);
        } catch (err) {
            console.error("Failed to update status:", err);
            toast.error("Failed to update status.");
        } finally {
            setUpdatingStatus(false);
            setEditingStatusFor(null);
        }
    };

    const closeInterviewModal = () => {
        setInterviewModalFor(null);
        setInterviewDate("");
        setInterviewMode("Video Call");
        setInterviewLink("");
        setInterviewLocation("");
        setInterviewNotes("");
    };

    const handleScheduleInterview = async () => {
        if (!interviewModalFor) return;
        if (!interviewDate) {
            toast.warn("Please pick an interview date and time.");
            return;
        }
        setScheduling(true);
        try {
            await updateApplicationStatus(interviewModalFor, "Interview Scheduled", {
                scheduledAt: new Date(interviewDate).toISOString(),
                mode: interviewMode,
                meetingLink: interviewLink,
                location: interviewLocation,
                notes: interviewNotes,
            });
            setCandidates((prev) =>
                prev.map((c) =>
                    c.latestApplicationId === interviewModalFor
                        ? { ...c, latestStatus: "Interview Scheduled" }
                        : c
                )
            );
            toast.success("Interview scheduled — the candidate has been emailed the details.");
            closeInterviewModal();
        } catch (err) {
            console.error("Failed to schedule interview:", err);
            toast.error("Failed to schedule interview.");
        } finally {
            setScheduling(false);
        }
    };

    const filteredCandidates = candidates.filter((c) => {
        const matchesSearch =
            !searchQuery.trim() ||
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "All" || c.latestStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-[#FFF8F3] p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl font-bold text-gray-900">All Candidates</h1>
                        {!loading && (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
                                {candidates.length} total
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Everyone who has applied to any of your jobs.</p>
                </div>

                {/* Search + filter bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 flex-shrink-0"
                    >
                        <option value="All">All Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-28 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse" />
                        ))}
                    </div>
                ) : candidates.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 flex flex-col items-center text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                            <Users size={24} className="text-orange-500" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">No candidates yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Once people apply to your jobs, they'll show up here.
                        </p>
                    </div>
                ) : filteredCandidates.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                        No candidates match your search.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredCandidates.map((c) => (
                            <div
                                key={c.candidateId}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
                            >
                                {c.profilePic ? (
                                    <img
                                        src={resolveMediaUrl(c.profilePic)}
                                        alt={c.name}
                                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 truncate">{c.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Applied for: {c.latestJobTitle}
                                    </p>
                                    {c.totalApplications > 1 && (
                                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium">
                                            {c.totalApplications} applications
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <div className="relative">
                                        {editingStatusFor === c.latestApplicationId ? (
                                            <select
                                                autoFocus
                                                value={c.latestStatus}
                                                disabled={updatingStatus}
                                                onChange={(e) => handleStatusChange(c.latestApplicationId, e.target.value)}
                                                onBlur={() => setEditingStatusFor(null)}
                                                className="text-xs font-medium rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                                            >
                                                {STATUS_OPTIONS.map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <button
                                                onClick={() => setEditingStatusFor(c.latestApplicationId)}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap hover:opacity-80 ${
                                                    statusColor[c.latestStatus] || "bg-gray-100 text-gray-600"
                                                }`}
                                                title="Change status"
                                            >
                                                {c.latestStatus}
                                                <Pencil size={11} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setInterviewModalFor(c.latestApplicationId)}
                                            className="flex items-center gap-1 border border-orange-200 text-orange-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                                            title="Schedule Interview"
                                        >
                                            <Calendar size={13} />
                                            Schedule
                                        </button>
                                        <button
                                            onClick={() => handleToggleSave(c.candidateId)}
                                            disabled={savingId === c.candidateId}
                                            title={c.isSaved ? "Remove from saved" : "Save candidate"}
                                            className={`p-2 rounded-lg disabled:opacity-50 transition-colors ${
                                                c.isSaved
                                                    ? "text-orange-600 hover:bg-orange-50"
                                                    : "text-gray-400 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            {c.isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Interview Scheduling Modal */}
            {interviewModalFor && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-[480px] max-h-[90dvh] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-9 w-9 rounded-full bg-orange-50 flex items-center justify-center">
                                <Calendar size={16} className="text-orange-600" />
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">Mode</label>
                                <select
                                    value={interviewMode}
                                    onChange={(e) => setInterviewMode(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeInterviewModal}
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleScheduleInterview}
                                disabled={scheduling}
                                className="flex-1 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}
                            >
                                {scheduling ? "Scheduling…" : "Schedule"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Candidates;
