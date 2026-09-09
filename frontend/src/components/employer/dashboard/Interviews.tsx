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
    "Video Call": <Video size={14} />,
    "Phone Call": <Phone size={14} />,
    "In-Person": <MapPin size={14} />,
};

// Left-border + badge colors per interview mode — gives the list a quick
// visual scan without reading the label on every card.
const modeAccent: Record<string, { border: string; badge: string }> = {
    "Video Call": { border: "border-l-blue-400", badge: "bg-blue-50 text-blue-700" },
    "Phone Call": { border: "border-l-green-400", badge: "bg-green-50 text-green-700" },
    "In-Person": { border: "border-l-orange-400", badge: "bg-orange-50 text-orange-700" },
};

// Formats an ISO date string into the value a <input type="datetime-local">
// expects (local time, no timezone/seconds), so the edit modal opens
// pre-filled with the interview's current date/time.
const toDatetimeLocalValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Groups interviews into day buckets for the "Today / Tomorrow / Wed 10 Sep"
// section headers — purely a rendering concern, doesn't touch fetched data.
const dayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
    if (dayKey(iso) === dayKey(tomorrow.toISOString())) return "Tomorrow";
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
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
            const res = await updateApplicationStatus(editingFor, "Interview Scheduled", {
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
            // Honest, per emailSent (see employerController.js's
            // updateApplication — it awaits the send and reports true/
            // false/null) — same pattern as Applicants.tsx's toasts.
            if (res?.emailSent === false) {
                toast.warn("Interview updated, but we couldn't send the candidate an email — please follow up directly.");
            } else {
                toast.success("Interview updated — the candidate has been emailed the new details.");
            }
            closeEdit();
        } catch (err) {
            console.error("Failed to update interview:", err);
            toast.error("Failed to update interview.");
        } finally {
            setSavingEdit(false);
        }
    };

    // Bucket interviews by day, preserving the order groups first appear in.
    const groups: { label: string; items: Interview[] }[] = [];
    interviews.forEach((iv) => {
        const label = dayLabel(iv.interview.scheduledAt);
        const existing = groups.find((g) => g.label === label);
        if (existing) existing.items.push(iv);
        else groups.push({ label, items: [iv] });
    });

    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    return (
        <div className="min-h-screen bg-[#FFF8F3] p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Scheduled Interviews</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Scheduled from the Applications page. Candidates are emailed these details automatically.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-sm text-gray-600 flex-shrink-0 self-start sm:self-auto">
                        <Calendar size={14} className="text-orange-500" />
                        {today}
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-28 bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-gray-200 animate-pulse" />
                        ))}
                    </div>
                ) : interviews.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 flex flex-col items-center text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                            <Calendar size={24} className="text-orange-500" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">No interviews scheduled</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Set one from the Applications page by changing a candidate's status to "Interview Scheduled".
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groups.map((group) => (
                            <div key={group.label}>
                                <h2 className="text-sm font-bold text-gray-900 mb-3">{group.label}</h2>
                                <div className="space-y-3">
                                    {group.items.map((iv) => {
                                        const accent = modeAccent[iv.interview.mode] || modeAccent["Video Call"];
                                        return (
                                            <div
                                                key={iv.applicationId}
                                                className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${accent.border} p-4 sm:p-5`}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900">{iv.candidate?.name}</p>
                                                        <p className="text-xs text-gray-500">{iv.jobTitle}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${accent.badge}`}>
                                                        {modeIcon[iv.interview.mode] || <Calendar size={14} />}
                                                        {iv.interview.mode}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-orange-500" />
                                                        {new Date(iv.interview.scheduledAt).toLocaleString("en-IN", {
                                                            dateStyle: "medium",
                                                            timeStyle: "short",
                                                        })}
                                                    </span>

                                                    {iv.interview.mode === "Video Call" && iv.interview.meetingLink && (
                                                        <a
                                                            href={iv.interview.meetingLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium"
                                                            title="Opens the meeting link you provided (Google Meet, Zoom, etc.) in a new tab"
                                                        >
                                                            <Video size={14} /> Join Meeting
                                                        </a>
                                                    )}
                                                    {iv.interview.mode === "Phone Call" && iv.interview.meetingLink && (
                                                        <span className="flex items-center gap-1.5">
                                                            <Phone size={14} /> {iv.interview.meetingLink}
                                                        </span>
                                                    )}
                                                    {iv.interview.mode === "In-Person" && iv.interview.location && (
                                                        <span className="flex items-center gap-1.5 max-w-[240px] truncate">
                                                            <MapPin size={14} /> {iv.interview.location}
                                                        </span>
                                                    )}
                                                </div>

                                                {iv.interview.notes && (
                                                    <p className="text-xs text-gray-500 mt-2.5 italic border-l-2 border-gray-200 pl-2.5">
                                                        "{iv.interview.notes}"
                                                    </p>
                                                )}

                                                <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex justify-end">
                                                    <button
                                                        onClick={() => openEdit(iv)}
                                                        className="flex items-center gap-1.5 border border-orange-200 text-orange-600 text-sm font-medium px-3.5 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                                                        title="Edit or reschedule this interview"
                                                    >
                                                        <Pencil size={14} /> Reschedule
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit / Reschedule Interview Modal */}
            {editingFor && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-[480px] max-h-[90dvh] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-9 w-9 rounded-full bg-orange-50 flex items-center justify-center">
                                <Pencil size={16} className="text-orange-600" />
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Mode
                                </label>
                                <select
                                    value={editMode}
                                    onChange={(e) => setEditMode(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
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
                                className="flex-1 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}
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
