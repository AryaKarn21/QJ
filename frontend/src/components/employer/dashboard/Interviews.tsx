import { useEffect, useState } from "react";
import { getScheduledInterviews, updateApplicationStatus } from "../employerApi/api";
import { Video, Phone, MapPin, Calendar, Pencil } from "lucide-react";
import { toast } from "react-toastify";

interface Interview {
    applicationId: string;
    candidate: { name: string; email: string };
    jobTitle: string;
    interview: {
        scheduledAt: string;
        mode: "Video Call" | "Phone Call" | "In-Person";
        meetingLink?: string;
        location?: string;
        notes?: string;
    };
}

const modeIcon: Record<string, JSX.Element> = {
    "Video Call": <Video size={16} />,
    "Phone Call": <Phone size={16} />,
    "In-Person": <MapPin size={16} />,
};

// Formats an ISO date string into the value a <input type="datetime-local">
// expects (local time, no timezone/seconds), so the edit modal opens
// pre-filled with the interview's current date/time.
const toDatetimeLocalValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Interviews = () => {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingFor, setEditingFor] = useState<string | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editMode, setEditMode] = useState("Video Call");
    const [editLink, setEditLink] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const loadInterviews = () => {
        setLoading(true);
        getScheduledInterviews()
            .then(setInterviews)
            .catch((err) => {
                console.error("Failed to load interviews:", err);
                toast.error("Failed to load interviews.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadInterviews();
    }, []);

    const openEdit = (iv: Interview) => {
        setEditingFor(iv.applicationId);
        setEditDate(toDatetimeLocalValue(iv.interview.scheduledAt));
        setEditMode(iv.interview.mode);
        setEditLink(iv.interview.meetingLink || "");
        setEditLocation(iv.interview.location || "");
        setEditNotes(iv.interview.notes || "");
    };

    const closeEdit = () => {
        setEditingFor(null);
        setEditDate("");
        setEditMode("Video Call");
        setEditLink("");
        setEditLocation("");
        setEditNotes("");
    };

    const handleSaveEdit = async () => {
        if (!editingFor) return;
        if (!editDate) {
            toast.warn("Please pick an interview date and time.");
            return;
        }
        setSavingEdit(true);
        try {
            await updateApplicationStatus(editingFor, "Interview Scheduled", {
                scheduledAt: new Date(editDate).toISOString(),
                mode: editMode,
                meetingLink: editLink,
                location: editLocation,
                notes: editNotes,
            });
            setInterviews((prev) =>
                prev.map((iv) =>
                    iv.applicationId === editingFor
                        ? {
                              ...iv,
                              interview: {
                                  scheduledAt: new Date(editDate).toISOString(),
                                  mode: editMode as Interview["interview"]["mode"],
                                  meetingLink: editLink,
                                  location: editLocation,
                                  notes: editNotes,
                              },
                          }
                        : iv
                )
            );
            toast.success("Interview updated — the candidate has been emailed the new details.");
            closeEdit();
        } catch (err) {
            console.error("Failed to update interview:", err);
            toast.error("Failed to update interview.");
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div className="min-h-screen overflow-auto p-6" style={{ maxHeight: "calc(100vh - 50px)" }}>
            <h1 className="text-2xl font-semibold mb-1">Interviews</h1>
            <p className="text-sm text-gray-500 mb-4">
                Scheduled from the Applications page. Candidates are emailed these details automatically.
            </p>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : interviews.length === 0 ? (
                <p className="text-gray-500">
                    No interviews scheduled yet — set one from the Applications page by changing a
                    candidate's status to "Interview Scheduled".
                </p>
            ) : (
                <div className="space-y-3">
                    {interviews.map((iv) => (
                        <div key={iv.applicationId} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                                {modeIcon[iv.interview.mode] || <Calendar size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{iv.candidate?.name}</p>
                                <p className="text-xs text-gray-500">{iv.candidate?.email} · Applied for {iv.jobTitle}</p>
                                <p className="text-xs text-gray-700 mt-1 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(iv.interview.scheduledAt).toLocaleString("en-IN", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    })}
                                    <span className="text-gray-400">· {iv.interview.mode}</span>
                                </p>
                                {iv.interview.notes && (
                                    <p className="text-xs text-gray-400 mt-1 italic">"{iv.interview.notes}"</p>
                                )}
                            </div>
                            {iv.interview.mode === "Video Call" && iv.interview.meetingLink && (
                                <a
                                    href={iv.interview.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-1.5"
                                    title="Opens the meeting link you provided (Google Meet, Zoom, etc.) in a new tab"
                                >
                                    <Video size={14} /> Join Meeting
                                </a>
                            )}
                            {iv.interview.mode === "Phone Call" && iv.interview.meetingLink && (
                                <span className="flex-shrink-0 text-sm text-gray-600 flex items-center gap-1.5">
                                    <Phone size={14} /> {iv.interview.meetingLink}
                                </span>
                            )}
                            {iv.interview.mode === "In-Person" && iv.interview.location && (
                                <span className="flex-shrink-0 text-sm text-gray-600 flex items-center gap-1.5 max-w-[200px] truncate">
                                    <MapPin size={14} /> {iv.interview.location}
                                </span>
                            )}
                            <button
                                onClick={() => openEdit(iv)}
                                className="flex-shrink-0 border border-gray-200 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                                title="Edit or reschedule this interview"
                            >
                                <Pencil size={14} /> Edit
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit / Reschedule Interview Modal */}
            {editingFor && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center">
                                <Pencil size={16} className="text-purple-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Edit Interview</h2>
                        </div>
                        <p className="text-sm text-gray-500 mb-5 ml-11">
                            The candidate will be emailed the updated details automatically.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Mode
                                </label>
                                <select
                                    value={editMode}
                                    onChange={(e) => setEditMode(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                >
                                    <option value="Video Call">Video Call</option>
                                    <option value="Phone Call">Phone Call</option>
                                    <option value="In-Person">In-Person</option>
                                </select>
                            </div>

                            {editMode === "In-Person" ? (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        placeholder="Office address"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        {editMode === "Video Call" ? "Meeting Link" : "Phone Number"}
                                    </label>
                                    <input
                                        type="text"
                                        value={editLink}
                                        onChange={(e) => setEditLink(e.target.value)}
                                        placeholder={editMode === "Video Call" ? "https://meet.google.com/…" : "+977-…"}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Notes (optional)
                                </label>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Anything the candidate should prepare or know in advance"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeEdit}
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                {savingEdit ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Interviews;