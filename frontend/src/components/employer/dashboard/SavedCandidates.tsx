import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSavedCandidates, toggleSavedCandidate } from "../employerApi/api";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { Bookmark, BookmarkX } from "lucide-react";
import { toast } from "react-toastify";

interface SavedCandidate {
    candidateId: string;
    name: string;
    email: string;
    profilePic?: string;
    savedFromJobTitle?: string | null;
    savedAt: string;
}

// Relative "Saved X ago" label — purely cosmetic formatting of the
// already-fetched savedAt timestamp, no extra state involved.
const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Saved just now";
    if (minutes < 60) return `Saved ${minutes} min${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Saved ${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Saved ${days} day${days === 1 ? "" : "s"} ago`;
    const months = Math.floor(days / 30);
    return `Saved ${months} month${months === 1 ? "" : "s"} ago`;
};

const SavedCandidates = () => {
    const [candidates, setCandidates] = useState<SavedCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        getSavedCandidates()
            .then(setCandidates)
            .catch((err) => {
                console.error("Failed to load saved candidates:", err);
                toast.error("Failed to load saved candidates.");
            })
            .finally(() => setLoading(false));
    }, []);

    const handleRemove = async (candidateId: string) => {
        setRemovingId(candidateId);
        try {
            await toggleSavedCandidate(candidateId);
            setCandidates((prev) => prev.filter((c) => c.candidateId !== candidateId));
            toast.success("Removed from saved candidates.");
        } catch (err) {
            console.error("Failed to remove saved candidate:", err);
            toast.error("Something went wrong.");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFF8F3] p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl font-bold text-gray-900">Saved Candidates</h1>
                        {!loading && candidates.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
                                {candidates.length} saved
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Candidates you've bookmarked for later.</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-44 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                                <div className="w-14 h-14 rounded-full bg-gray-200 mb-3" />
                                <div className="h-3.5 w-2/3 bg-gray-200 rounded mb-2" />
                                <div className="h-3 w-1/2 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : candidates.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 flex flex-col items-center text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                            <Bookmark size={24} className="text-orange-500" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">No saved candidates yet</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-5 max-w-sm">
                            Bookmark candidates from the Candidates page to see them here.
                        </p>
                        <Link
                            to="/employer/candidates"
                            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                        >
                            Browse Candidates
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {candidates.map((c) => (
                            <div
                                key={c.candidateId}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col hover:shadow-md transition-shadow"
                            >
                                {c.profilePic ? (
                                    <img
                                        src={resolveMediaUrl(c.profilePic)}
                                        alt={c.name}
                                        className="w-14 h-14 rounded-full object-cover mb-3"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-semibold text-lg mb-3">
                                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                )}

                                <p className="font-bold text-[15px] text-gray-900 truncate">{c.name}</p>
                                <p className="text-sm text-gray-500 truncate">{c.email}</p>

                                {c.savedFromJobTitle && (
                                    <span className="inline-block mt-2.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium w-fit truncate max-w-full">
                                        Saved from: {c.savedFromJobTitle}
                                    </span>
                                )}

                                <p className="text-xs text-gray-400 mt-2">{timeAgo(c.savedAt)}</p>

                                <button
                                    onClick={() => handleRemove(c.candidateId)}
                                    disabled={removingId === c.candidateId}
                                    title="Remove from saved"
                                    className="mt-4 w-full flex items-center justify-center gap-1.5 border border-red-200 text-red-600 text-sm font-medium py-2 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                                >
                                    <BookmarkX size={16} />
                                    {removingId === c.candidateId ? "Removing…" : "Remove"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedCandidates;
