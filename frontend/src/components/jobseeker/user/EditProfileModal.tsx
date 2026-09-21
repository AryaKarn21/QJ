import React, { useState } from "react";
import { PlusCircle, FileText, ExternalLink, X } from "lucide-react";
import CompanySearchInput from "./CompanySearchInput";
import { TagInput } from "../../common/TagInput";
import ImageCropModal from "../../common/ImageCropModal";
import { resolveResumeUrl } from "../../../utils/mediaUrl";

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
        headline?: string;
        bio?: string;
        skills: string;
        qualifications: Qualification[];
        experiences: Experience[];
        projects: Project[];
        certifications: Certification[];
        resume: File | null;
        profilePic: File | null;
        existingProfilePicUrl?: string;
        existingResumeUrl?: string;
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-5 sm:p-7 relative max-h-[90dvh] overflow-y-auto border border-gray-100">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Update your personal details, summary, resume, and experience.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Your full name"
                        />
                    </div>

                    {/* Headline */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold text-gray-700">Professional Headline</label>
                            <span className="text-[11px] text-gray-400">{(formState.headline || '').length}/160</span>
                        </div>
                        <input
                            type="text"
                            maxLength={160}
                            value={formState.headline || ''}
                            onChange={(e) => setFormState({ ...formState, headline: e.target.value })}
                            placeholder="e.g. Senior Frontend Developer | React & TypeScript"
                            className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* About Me / Bio */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold text-gray-700">About Me / Summary</label>
                            <span className="text-[11px] text-gray-400">{(formState.bio || '').length}/600</span>
                        </div>
                        <textarea
                            rows={4}
                            maxLength={600}
                            value={formState.bio || ''}
                            onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                            placeholder="Write about yourself, your career path, technical passions, and what kind of opportunities you're looking for..."
                            className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                        />
                    </div>

                    {/* Profile Picture */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Profile Picture</label>
                        {previewSrc && (
                            <div className="mt-1 mb-3 flex items-center gap-3">
                                <img
                                    src={previewSrc}
                                    alt="Current profile"
                                    className="h-20 w-20 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                                />
                                <p className="text-xs text-gray-500">
                                    {formState.profilePic ? "New picture selected" : "Current picture — choose a new file to change"}
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
                            className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                    </div>

                    {/* Resume Card & Upload */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Resume / CV</label>
                        <p className="text-xs text-gray-500 mb-3">Upload your resume in PDF or Word document format (up to 10MB).</p>

                        {formState.existingResumeUrl && !formState.resume && (
                            <div className="mb-3 flex items-center justify-between p-3 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">Current Resume Attached</p>
                                        <p className="text-[11px] text-emerald-600 font-medium">Ready for recruiter review</p>
                                    </div>
                                </div>
                                <a
                                    href={resolveResumeUrl(formState.existingResumeUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline ml-2 shrink-0"
                                >
                                    <span>Preview</span>
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        )}

                        {formState.resume && (
                            <div className="mb-3 flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-primary truncate">{formState.resume.name}</p>
                                        <p className="text-[11px] text-gray-500">{Math.round(formState.resume.size / 1024)} KB · Ready to save</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormState({ ...formState, resume: null })}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium ml-2 shrink-0"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) =>
                                setFormState({ ...formState, resume: e.target.files?.[0] || null })
                            }
                            className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                    </div>

                    {/* Skills */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Skills</label>
                        <TagInput
                            value={formState.skills}
                            onChange={(csv) => setFormState({ ...formState, skills: csv })}
                            placeholder="Type a skill and press Enter, e.g. React"
                            className="mt-1"
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