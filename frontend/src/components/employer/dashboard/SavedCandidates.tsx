import { useEffect, useState } from "react";
import { getSavedCandidates, toggleSavedCandidate } from "../employerApi/api";
import { BookmarkX } from "lucide-react";
import { toast } from "react-toastify";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || import.meta.env.VITE_API_BASE_URL || "https://qj.onrender.com";

interface SavedCandidate {
    candidateId: string;
    name: string;
    email: string;
    profilePic?: string;
    savedFromJobTitle?: string | null;
    savedAt: string;
}

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
        <div className="min-h-screen overflow-auto p-6" style={{ maxHeight: "calc(100vh - 50px)" }}>
            <h1 className="text-2xl font-semibold mb-1">Saved Candidates</h1>
            <p className="text-sm text-gray-500 mb-4">Candidates you've bookmarked for later.</p>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : candidates.length === 0 ? (
                <p className="text-gray-500">
                    You haven't saved anyone yet — bookmark candidates from the Candidates page to see them here.
                </p>
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
                                {c.savedFromJobTitle && (
                                    <p className="text-xs text-gray-400 mt-0.5">Saved from: {c.savedFromJobTitle}</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleRemove(c.candidateId)}
                                disabled={removingId === c.candidateId}
                                title="Remove from saved"
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50"
                            >
                                <BookmarkX size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedCandidates;