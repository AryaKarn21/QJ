import { useEffect, useState } from "react";
import { getCandidates, toggleSavedCandidate, updateApplicationStatus } from "../employerApi/api";
import { Bookmark, BookmarkCheck, Pencil, Calendar } from "lucide-react";
import { toast } from "react-toastify";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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

    return (
        <div className="min-h-screen overflow-auto p-6" style={{ maxHeight: "calc(100vh - 50px)" }}>
            <h1 className="text-2xl font-semibold mb-1">Candidates</h1>
            <p className="text-sm text-gray-500 mb-4">Everyone who has applied to any of your jobs.</p>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : candidates.length === 0 ? (
                <p className="text-gray-500">No candidates yet — once people apply to your jobs, they'll show up here.</p>
            ) : (
                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {candidates.map((c) => (
                        <div key={c.candidateId} className="flex items-center gap-4 p-4">
                            {c.profilePic ? (
                                <img
                                    src={`${MEDIA_URL.replace(/\/$/, "")}/${c.profilePic.replace(/^\//, "")}`}
                                    alt={c.name}
                                    className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                                    {c.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{c.name}</p>
                                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Applied to {c.latestJobTitle}
                                    {c.totalApplications > 1 && ` (+${c.totalApplications - 1} more)`}
                                </p>
                            </div>

                            <div className="relative flex-shrink-0">
                                {editingStatusFor === c.latestApplicationId ? (
                                    <select
                                        autoFocus
                                        value={c.latestStatus}
                                        disabled={updatingStatus}
                                        onChange={(e) => handleStatusChange(c.latestApplicationId, e.target.value)}
                                        onBlur={() => setEditingStatusFor(null)}
                                        className="text-xs font-medium rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap hover:opacity-80 ${
                                            statusColor[c.latestStatus] || "bg-gray-100 text-gray-600"
                                        }`}
                                        title="Change status"
                                    >
                                        {c.latestStatus}
                                        <Pencil size={11} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => handleToggleSave(c.candidateId)}
                                disabled={savingId === c.candidateId}
                                title={c.isSaved ? "Remove from saved" : "Save candidate"}
                                className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 disabled:opacity-50"
                            >
                                {c.isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                            </button>
                        </div>
                    ))}
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
                                onClick={closeInterviewModal}
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleScheduleInterview}
                                disabled={scheduling}
                                className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
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