import { useCallback, useEffect, useState } from "react";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { useParams } from "react-router-dom";
import { getAllUsers } from "./adminApi/api";
import { AxiosError } from "axios";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { SkeletonCircle, SkeletonText, SkeletonParagraph } from "../ui/Skeleton";

interface Qualification {
    degree: string;
    institution: string;
    year: number;
}

interface Experience {
    jobPosition: string;
    institution: string;
    duration: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: "jobseeker" | "employer";
    profilePic?: string;
    companyLogo?: string;
    resume?: string;
    description?: string;
    address?: string;
    telephone?: string;
    panNumber?: string;
    establishedDate?: string;
    industryType?: string;
    companySize?: string;
    skills?: string[];
    qualifications?: Qualification[];
    experiences?: Experience[];
    createdAt: string;
}

import { resolveMediaUrl } from "../../utils/mediaUrl";

const UsersProfile = () => {
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<User | null>(null);

    const fetchUser = useCallback(async () => {
        try {
            const allUsers: User[] = await getAllUsers();
            const found = allUsers.find((u) => u._id === id);
            setUser(found || null);
        } catch (err) {
            const error = err as AxiosError;
            console.error("Failed to load user:", error.message);
        }
    }, [id]);

    useEffect(() => { fetchUser(); }, [fetchUser]);
    useAutoRefresh(() => fetchUser(), 30000);

    if (!user) return (
        <div className="p-6" aria-busy="true" aria-label="Loading user profile">
            <SkeletonText width="w-40" height="h-8" className="mb-4" />
            <div className="bg-white rounded-lg shadow-sm p-6 flex space-x-6">
                <SkeletonCircle size="h-24 w-24" />
                <div className="flex-1 space-y-2 pt-1">
                    <SkeletonText width="w-1/3" height="h-5" />
                    <SkeletonText width="w-1/2" height="h-4" />
                    <SkeletonText width="w-1/4" height="h-4" />
                </div>
            </div>
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                <SkeletonParagraph lines={4} />
            </div>
        </div>
    );

    const avatar = user.profilePic || user.companyLogo;
    const imageSrc = resolveMediaUrl(avatar) || null;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">User Profile</h2>

            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 flex space-x-6">
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={user.name}
                        className="w-24 h-24 bg-gray-200 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                            {user.name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <div>
                    <h3 className="text-xl font-semibold">{user.name}</h3>
                    <p className="text-gray-500">{user.email}</p>
                    <p className="text-sm capitalize mt-1">
                        Role: <span className="font-medium text-primary">{user.role}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                        Joined on: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Role-Specific Info */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6 space-y-4">
                {user.role === "jobseeker" && (
                    <>
                        <h4 className="text-lg font-semibold">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {user.skills?.length ? (
                                user.skills.map((skill, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                                    >
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-500">No skills listed.</p>
                            )}
                        </div>

                        <h4 className="text-lg font-semibold mt-4">Qualifications</h4>
                        {user.qualifications?.length ? (
                            <ul className="list-disc ml-5">
                                {user.qualifications.map((q, i) => (
                                    <li key={i}>
                                        {q.degree}, {q.institution} ({q.year})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No qualifications listed.</p>
                        )}

                        <h4 className="text-lg font-semibold mt-4">Experience</h4>
                        {user.experiences?.length ? (
                            <ul className="list-disc ml-5">
                                {user.experiences.map((e, i) => (
                                    <li key={i}>
                                        {e.jobPosition} at {e.institution} ({e.duration})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No experiences listed.</p>
                        )}

                        {/* Resume Download */}
                        <div className="mt-6">
                            <h4 className="text-lg font-semibold">Resume</h4>
                            {user.resume ? (
                                <a
                                    href={resolveMediaUrl(user.resume)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-2 py-1 bg-primary text-white rounded-md hover:bg-primary/90 transition"
                                >
                                    View Resume
                                </a>
                            ) : (
                                    <div className=" inline-block bg-gray-500  items-center px-2  rounded-md">
                                        <p className="text-white py-2">No resume uploaded</p>
                                    </div>
                            )}
                        </div>
                    </>
                )}

                {user.role === "employer" && (
                    <>
                        <h4 className="text-lg font-semibold">Company Info</h4>
                        <p>
                            <strong>Industry:</strong> {user.industryType || "Not available"}
                        </p>
                        <p>
                            <strong>Size:</strong> {user.companySize || "Not available"}
                        </p>
                        <p>
                            <strong>PAN:</strong> {user.panNumber || "Not available"}
                        </p>
                        <p>
                            <strong>Established:</strong>{" "}
                            {user.establishedDate
                                ? new Date(user.establishedDate).toLocaleDateString()
                                : "Not available"}
                        </p>
                        <p>
                            <strong>Address:</strong> {user.address || "Not available"}
                        </p>
                        <p>
                            <strong>Telephone:</strong> {user.telephone || "Not available"}
                        </p>
                        <p>
                            <strong>Description:</strong> {user.description || "Not available"}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default UsersProfile;
