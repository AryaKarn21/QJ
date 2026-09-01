import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getJobApplicants, updateApplicationStatus } from "../employerApi/api";
import { Eye } from "lucide-react";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

interface Applicant {
    applicationId: string;
    applicant: {
        name: string;
        email: string;
    } | null;
    coverLetter: string;
    resume: string;
    status: string;
    appliedAt: string;
}

interface JobApplicationResponse {
    jobTitle: string;
    jobId: string;
    applicants: Applicant[];
}

const statusColors = {
    Pending: "bg-yellow-200 text-black",
    Reviewed: "bg-blue-200 text-black",
    Accepted: "bg-green-200 text-black",
    Rejected: "bg-red-200 text-black",
    Default: "bg-gray-300 text-black",
};

const JobApplicants = () => {
    const { jobId } = useParams();
    const [data, setData] = useState<JobApplicationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);

    useEffect(() => {
        if (!jobId) return;

        const fetchApplicants = async () => {
            try {
                const result = await getJobApplicants(jobId);
                setData(result);
            } catch (error) {
                console.error("Failed to load applicants", error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplicants();
    }, [jobId]);

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        try {
            await updateApplicationStatus(applicationId, newStatus);

            // Update local state
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    applicants: prev.applicants.map((applicant) =>
                        applicant.applicationId === applicationId ? { ...applicant, status: newStatus } : applicant
                    ),
                };
            });
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    if (!data) return <div className="p-6">No applicants found.</div>;

    return (
        <div
            className="min-h-screen overflow-auto p-6 max-w-6xl mx-auto"
            style={{ maxHeight: "calc(100vh - 50px)" }}
        >
            <h1 className="text-2xl font-bold mb-6">Applicants for: {data.jobTitle}</h1>

            {data.applicants.length === 0 ? (
                <p>No applicants yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full table-auto border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="p-3 border">Name</th>
                                <th className="p-3 border">Email</th>
                                <th className="p-3 border">Status</th>
                                <th className="p-3 border">Applied</th>
                                <th className="p-3 border">Cover Letter</th>
                                <th className="p-3 border">Resume</th>
                                <th className="p-3 border">Update Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.applicants.map((applicant) => (
                                <tr key={applicant.applicationId} className="hover:bg-gray-50">
                                    <td className="p-3 border">{applicant.applicant?.name || (<span className="italic text-gray-400">No name</span>)}</td>
                                    <td className="p-3 border">{applicant.applicant?.email || (<span className="italic text-gray-400">No email</span>)}</td>
                                    <td className="p-3 border">
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${statusColors[applicant.status as keyof typeof statusColors] || statusColors.Default
                                                }`}
                                        >
                                            {applicant.status}
                                        </span>
                                    </td>
                                    <td className="p-3 border">
                                        {new Date(applicant.appliedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 border">
                                        <button
                                            onClick={() => setSelectedCoverLetter(applicant.coverLetter)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Click here ...
                                        </button>
                                    </td>
                                    <td className="p-3 border">
                                        {applicant.resume ? (
                                            <a
                                                href={`${MEDIA_URL.replace(/\/$/, "")}/${applicant.resume
                                                    .replace(/\\/g, "/")
                                                    .replace(/^.*\/uploads/, "uploads")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <button className="flex items-center text-white bg-primary px-3 py-1 rounded hover:bg-primary/90">
                                                    <Eye size={14} className="mr-1" />
                                                    Resume
                                                </button>
                                            </a>
                                        ) : (
                                            <span className="text-gray-500 text-xs">No resume</span>
                                        )}
                                    </td>
                                    <td className="p-3 border">
                                        <select
                                            value={applicant.status}
                                            onChange={(e) =>
                                                handleStatusChange(applicant.applicationId, e.target.value)
                                            }
                                            className="border rounded px-2 py-1 text-sm w-full"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Reviewed">Reviewed</option>
                                            <option value="Accepted">Accepted</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {selectedCoverLetter && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedCoverLetter}</p>
                        <div className="mt-4 text-right">
                            <button
                                onClick={() => setSelectedCoverLetter(null)}
                                className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobApplicants;
