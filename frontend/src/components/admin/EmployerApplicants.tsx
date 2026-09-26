import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAllApplicantsForEmployerJobs, updateApplicationStatus } from "./adminApi/api";
import { Eye } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { SkeletonRow, SkeletonText } from "../ui/Skeleton";
import { resolveResumeUrl, isUnrecoverableResumePath } from "../../utils/mediaUrl";

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

    const fetchApplicants = useCallback(async (opts: { silent?: boolean } = {}) => {
        if (!employerId) return;
        if (!opts.silent) setLoading(true);
        try {
            const result = await getAllApplicantsForEmployerJobs(employerId);
            setData(result);
        } catch (err) {
            console.error("Error fetching applicants:", err);
        } finally {
            if (!opts.silent) setLoading(false);
        }
    }, [employerId]);

    useEffect(() => { fetchApplicants(); }, [fetchApplicants]);
    useAutoRefresh(() => fetchApplicants(), 30000);

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

    if (loading) return (
        <div className="min-h-screen overflow-auto p-4 sm:p-6" aria-busy="true" aria-label="Loading applicants">
            <SkeletonText width="w-48" height="h-8" className="mb-4" />
            <div className="bg-white p-4 rounded shadow-sm overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                    <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonRow key={i} columns={7} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div
            className="min-h-screen overflow-auto p-4 sm:p-6"
            style={{ maxHeight: "calc(100dvh - 50px)" }}
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
                                                                    : applicant.status === "Shortlisted"
                                                                        ? "bg-purple-200 text-black"
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
                                                {applicant.resume && !isUnrecoverableResumePath(applicant.resume) ? (
                                                    <a
                                                        href={resolveResumeUrl(applicant.resume)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <button className="flex items-center text-white bg-primary px-3 py-1 rounded text-xs hover:bg-primary/90">
                                                            <Eye size={13} className="mr-1" />
                                                            Resume
                                                        </button>
                                                    </a>
                                                ) : applicant.resume ? (
                                                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded text-xs inline-block">
                                                        Resume unavailable — please ask the applicant to upload again
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No resume</span>
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
                                                    <option value="Shortlisted">Shortlisted</option>
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
            <Modal
                open={!!selectedCoverLetter}
                onClose={() => setSelectedCoverLetter(null)}
                title="Cover Letter"
                footer={
                    <button
                        onClick={() => setSelectedCoverLetter(null)}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded text-sm"
                    >
                        Close
                    </button>
                }
            >
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{selectedCoverLetter}</p>
            </Modal>
        </div>
    );
};

export default EmployerApplicants;
