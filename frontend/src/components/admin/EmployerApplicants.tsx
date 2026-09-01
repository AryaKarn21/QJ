import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAllApplicantsForEmployerJobs, updateApplicationStatus } from "./adminApi/api";
import { Eye } from "lucide-react";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

interface Applicant {
    applicant: {
        name: string;
        email: string;
    } | null;
    applicationId: string;
    coverLetter: string;
    resume: string;
    status: string;
    appliedAt: string;
}

interface JobWithApplicants {
    jobId: string;
    jobTitle: string;
    applicants: Applicant[];
}

const EmployerApplicants = () => {
    const { employerId } = useParams<{ employerId: string }>();
    const [data, setData] = useState<JobWithApplicants[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);

    useEffect(() => {
        if (!employerId) return;

        const fetchApplicants = async () => {
            try {
                setLoading(true);
                const result = await getAllApplicantsForEmployerJobs(employerId);
                setData(result);
            } catch (err) {
                console.error("Error fetching applicants:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchApplicants();
    }, [employerId]);

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        try {
            await updateApplicationStatus(applicationId, newStatus);
            setData((prev) =>
                prev.map((job) => ({
                    ...job,
                    applicants: job.applicants.map((app) =>
                        app.applicationId === applicationId ? { ...app, status: newStatus } : app
                    ),
                }))
            );
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    if (!employerId) {
        return <p className="p-4 text-red-600">Employer ID not provided in URL.</p>;
    }

    if (loading) return <p className="p-4">Loading applicants...</p>;

    return (
        <div
            className="min-h-screen overflow-auto p-6"
            style={{ maxHeight: "calc(100vh - 50px)" }}
        >
            <h1 className="text-2xl font-semibold mb-4">All Applicants</h1>
            {data.length === 0 ? (
                <p>No applicants found for this employer's jobs.</p>
            ) : (
                data.map((job) => (
                    <div key={job.jobId} className="mb-8 bg-white p-4 rounded shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">{job.jobTitle}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-sm">
                                        <th className="p-2 border">Name</th>
                                        <th className="p-2 border">Email</th>
                                        <th className="p-2 border">Status</th>
                                        <th className="p-2 border">Applied</th>
                                        <th className="p-2 border">Cover Letter</th>
                                        <th className="p-2 border">Resume</th>
                                        <th className="p-2 border">Update Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.applicants.map((applicant) => (
                                        <tr key={applicant.applicationId} className="text-sm hover:bg-gray-50">
                                            <td className="p-2 border">
                                                {applicant.applicant?.name || (
                                                    <span className="italic text-gray-400">No name</span>
                                                )}
                                            </td>
                                            <td className="p-2 border">
                                                {applicant.applicant?.email || (
                                                    <span className="italic text-gray-400">No email</span>
                                                )}
                                            </td>
                                            <td className="p-2 border">
                                                <span
                                                    className={`px-2 py-1 text-sm rounded-md ${applicant.status === "Pending"
                                                            ? "bg-yellow-200 text-black"
                                                            : applicant.status === "Reviewed"
                                                                ? "bg-blue-200 text-black"
                                                                : applicant.status === "Accepted"
                                                                    ? "bg-green-200 text-black"
                                                                    : applicant.status === "Rejected"
                                                                        ? "bg-red-200 text-black"
                                                                        : "bg-gray-300 text-black"
                                                        }`}
                                                >
                                                    {applicant.status}
                                                </span>
                                            </td>
                                            <td className="p-2 border">
                                                {new Date(applicant.appliedAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-2 border">
                                                <button
                                                    onClick={() => setSelectedCoverLetter(applicant.coverLetter)}
                                                    className="text-blue-600 text-sm hover:text-blue-800"
                                                >
                                                    Click here ...
                                                </button>
                                            </td>
                                            <td className="p-2 border">
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
                                            <td className="p-2 border">
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
                    </div>
                ))
            )}

            {/* Modal for Cover Letter */}
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

export default EmployerApplicants;
