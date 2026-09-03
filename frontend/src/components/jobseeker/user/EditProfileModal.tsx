import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import CompanySearchInput from "./CompanySearchInput";
import { TagInput } from "../../common/TagInput";
import ImageCropModal from "../../common/ImageCropModal";

interface Qualification {
    degree: string;
    institution: string;
    year: number;
}

interface Experience {
    jobPosition: string;
    institution: string;
    duration: string;
    companyId?: string | null;
    current?: boolean;
}

interface Project {
    title: string;
    description: string;
    link: string;
    technologies: string;
}

interface Certification {
    name: string;
    issuer: string;
    year: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    onSave: () => void;
    formState: {
        name: string;
        skills: string;
        qualifications: Qualification[];
        experiences: Experience[];
        projects: Project[];
        certifications: Certification[];
        resume: File | null;
        profilePic: File | null;
        // Existing hosted URL for the profile picture — shown when no new
        // file has been selected so the user can see their current picture.
        existingProfilePicUrl?: string;
    };
    setFormState: React.Dispatch<React.SetStateAction<any>>;
    addQualification: () => void;
    removeQualification: (index: number) => void;
    handleQualificationChange: (index: number, updated: Qualification) => void;
    addExperience: () => void;
    removeExperience: (index: number) => void;
    handleExperienceChange: (index: number, updated: Experience) => void;
    addProject: () => void;
    removeProject: (index: number) => void;
    handleProjectChange: (index: number, updated: Project) => void;
    addCertification: () => void;
    removeCertification: (index: number) => void;
    handleCertificationChange: (index: number, updated: Certification) => void;
}

const EditProfileModal: React.FC<Props> = ({
    show,
    onClose,
    onSave,
    formState,
    setFormState,
    addQualification,
    removeQualification,
    handleQualificationChange,
    addExperience,
    removeExperience,
    handleExperienceChange,
    addProject,
    removeProject,
    handleProjectChange,
    addCertification,
    removeCertification,
    handleCertificationChange,
}) => {
    // Raw file the user just picked, awaiting crop/zoom adjustment — kept
    // as local state since it's transient UI, not part of the saved form.
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    if (!show) return null;

    // Resolve the preview URL: prefer a freshly selected File, fall back to
    // the existing hosted URL so the picture doesn't disappear on reopen.
    const previewSrc = formState.profilePic
        ? URL.createObjectURL(formState.profilePic)
        : formState.existingProfilePicUrl || null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Edit Profile</h2>

                <div className="grid grid-cols-1 gap-4">
                    {/* Name */}
                    <div>
                        <label className="font-semibold">Name</label>
                        <input
                            type="text"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            className="w-full border px-3 py-2 rounded mt-1"
                        />
                    </div>

                    {/* Profile Picture */}
                    <div>
                        <label className="font-semibold">Profile Picture</label>
                        {previewSrc && (
                            <div className="mt-2 mb-2">
                                <img
                                    src={previewSrc}
                                    alt="Current profile"
                                    className="h-32 w-32 rounded-full object-cover border"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {formState.profilePic ? "New picture selected" : "Current picture — upload a new one to change"}
                                </p>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                e.target.value = ""; // allow re-selecting the same file later
                                if (file) setPendingFile(file);
                            }}
                            className="w-full mt-1"
                        />
                    </div>

                    {/* Skills */}
                    <div>
                        <label className="font-semibold">Skills</label>
                        <TagInput
                            value={formState.skills}
                            onChange={(csv) => setFormState({ ...formState, skills: csv })}
                            placeholder="Type a skill and press Enter, e.g. React"
                            className="mt-1"
                        />
                    </div>

                    {/* Resume */}
                    <div>
                        <label className="font-semibold">Resume (PDF)</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) =>
                                setFormState({ ...formState, resume: e.target.files?.[0] || null })
                            }
                            className="w-full mt-1"
                        />
                    </div>

                    {/* Qualifications */}
                    <div>
                        <label className="block font-semibold mb-2">Qualifications</label>
                        {formState.qualifications.map((q: Qualification, index: number) => (
                            <div key={index} className="space-y-2 border rounded p-3 mb-2">
                                <input
                                    type="text"
                                    placeholder="Degree"
                                    value={q.degree}
                                    onChange={(e) =>
                                        handleQualificationChange(index, { ...q, degree: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Institution"
                                    value={q.institution}
                                    onChange={(e) =>
                                        handleQualificationChange(index, { ...q, institution: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <input
                                    type="number"
                                    placeholder="year"
                                    value={q.year}
                                    onChange={(e) =>
                                        handleQualificationChange(index, {
                                            ...q,
                                            year: parseInt(e.target.value, 10),
                                        })
                                    }
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <button
                                    onClick={() => removeQualification(index)}
                                    className="text-red-600 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addQualification}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                        >
                            <PlusCircle size={18} className="mr-1" /> Add Qualification
                        </button>
                    </div>

                    {/* Experience */}
                    <div>
                        <label className="block font-semibold mb-2">Experience</label>
                        {formState.experiences.map((exp: Experience, index: number) => (
                            <div key={index} className="space-y-2 border rounded p-3 mb-2">
                                <input
                                    type="text"
                                    placeholder="Job Position"
                                    value={exp.jobPosition}
                                    onChange={(e) =>
                                        handleExperienceChange(index, { ...exp, jobPosition: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <CompanySearchInput
                                    value={exp.institution}
                                    companyId={exp.companyId ?? null}
                                    placeholder="Company name — start typing to search, or type your own"
                                    onChange={({ institution, companyId }) =>
                                        handleExperienceChange(index, { ...exp, institution, companyId })
                                    }
                                />
                                <input
                                    type="text"
                                    placeholder="Duration (e.g. 2022 – Present)"
                                    value={exp.duration}
                                    onChange={(e) =>
                                        handleExperienceChange(index, { ...exp, duration: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={!!exp.current}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFormState((prev: any) => ({
                                                ...prev,
                                                experiences: prev.experiences.map((item: Experience, i: number) =>
                                                    i === index
                                                        ? { ...item, current: checked }
                                                        : { ...item, current: checked ? false : item.current }
                                                ),
                                            }));
                                        }}
                                    />
                                    I currently work here
                                </label>
                                <button
                                    onClick={() => removeExperience(index)}
                                    className="text-red-600 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addExperience}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                        >
                            <PlusCircle size={18} className="mr-1" /> Add Experience
                        </button>
                    </div>

                    {/* Projects */}
                    <div>
                        <label className="block font-semibold mb-2">Projects</label>
                        {formState.projects.map((proj: Project, index: number) => (
                            <div key={index} className="space-y-2 border rounded p-3 mb-2">
                                <input
                                    type="text"
                                    placeholder="Project title"
                                    value={proj.title}
                                    onChange={(e) => handleProjectChange(index, { ...proj, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <textarea
                                    placeholder="Short description"
                                    value={proj.description}
                                    onChange={(e) => handleProjectChange(index, { ...proj, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    rows={2}
                                />
                                <input
                                    type="text"
                                    placeholder="Link (optional)"
                                    value={proj.link}
                                    onChange={(e) => handleProjectChange(index, { ...proj, link: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Technologies used (optional)"
                                    value={proj.technologies}
                                    onChange={(e) => handleProjectChange(index, { ...proj, technologies: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <button onClick={() => removeProject(index)} className="text-red-600 text-sm">
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addProject}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                        >
                            <PlusCircle size={18} className="mr-1" /> Add Project
                        </button>
                    </div>

                    {/* Certifications */}
                    <div>
                        <label className="block font-semibold mb-2">Certifications</label>
                        {formState.certifications.map((cert: Certification, index: number) => (
                            <div key={index} className="space-y-2 border rounded p-3 mb-2">
                                <input
                                    type="text"
                                    placeholder="Certification name"
                                    value={cert.name}
                                    onChange={(e) => handleCertificationChange(index, { ...cert, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Issuing organization"
                                    value={cert.issuer}
                                    onChange={(e) => handleCertificationChange(index, { ...cert, issuer: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Year"
                                    value={cert.year}
                                    onChange={(e) => handleCertificationChange(index, { ...cert, year: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <button onClick={() => removeCertification(index)} className="text-red-600 text-sm">
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addCertification}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                        >
                            <PlusCircle size={18} className="mr-1" /> Add Certification
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
                        Cancel
                    </button>
                    <button onClick={onSave} className="px-4 py-2 bg-primary text-white rounded">
                        Save Changes
                    </button>
                </div>
            </div>

            {pendingFile && (
                <ImageCropModal
                    file={pendingFile}
                    onCancel={() => setPendingFile(null)}
                    onConfirm={(blob) => {
                        setFormState({
                            ...formState,
                            profilePic: new File([blob], "avatar.jpg", { type: "image/jpeg" }),
                        });
                        setPendingFile(null);
                    }}
                />
            )}
        </div>
    );
};

export default EditProfileModal;