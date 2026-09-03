import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Linkedin, Github, Twitter, Globe, Download,
  GraduationCap, BadgeCheck, Briefcase, Pencil, Building2, Users, UserPlus, Camera, Loader2,
} from "lucide-react";
import { getJobseekerProfile, updateJobseekerProfile, updateJobseekerCareerStatus } from "../jobseekerApi/api";
import { fetchFollowCounts } from "../../../api/followApi";
import EditProfileModal from "./EditProfileModal";
import { ProfileStatusBadge } from "../../common/profileStatus/ProfileStatusBadge";
import { ProfileStatusEditor } from "../../common/profileStatus/ProfileStatusEditor";
import type { ProfileStatus } from "../../../types/profileStatus";

type Qualification = { degree: string; institution: string; year: number };
type Experience = { jobPosition: string; institution: string; duration: string; companyId?: string | null; current?: boolean };
type Project = { title: string; description: string; link: string; technologies: string };
type Certification = { name: string; issuer: string; year: string };
type SocialLinks = { linkedin?: string; twitter?: string; github?: string; website?: string };

type JobseekerProfile = {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
  resume?: string;
  skills: string[];
  qualifications: Qualification[];
  experiences: Experience[];
  projects?: Project[];
  certifications?: Certification[];
  role: string;
  socialLinks?: SocialLinks;
  profileStatus?: ProfileStatus | null;
};

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const UserProfile = () => {
  const [profile, setProfile] = useState<JobseekerProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    name: "",
    skills: "",
    qualifications: [] as Qualification[],
    experiences: [] as Experience[],
    projects: [] as Project[],
    certifications: [] as Certification[],
    resume: null as File | null,
    profilePic: null as File | null,
    existingProfilePicUrl: undefined as string | undefined,
  });

  useEffect(() => {
    getJobseekerProfile()
      .then(setProfile)
      .catch((err) => console.error("Failed to load profile:", err));
  }, []);

  // Reuses the Community module's existing follow-counts endpoint rather
  // than duplicating that logic here — this page just needs the numbers
  // and a link into the same Followers/Following pages Community already has.
  useEffect(() => {
    if (!profile?._id) return;
    fetchFollowCounts(profile._id)
      .then((c) => setFollowCounts({ followers: c.followers, following: c.following }))
      .catch(() => {});
  }, [profile?._id]);

  useEffect(() => {
    if (profile) {
      setFormState({
        name: profile.name || "",
        skills: profile.skills?.join(", ") || "",
        qualifications: profile.qualifications || [],
        experiences: profile.experiences || [],
        projects: profile.projects || [],
        certifications: profile.certifications || [],
        resume: null,
        profilePic: null,
        // So the Edit Profile modal shows the current picture on open
        // instead of a blank uploader — see EditProfileModal's previewSrc.
        existingProfilePicUrl: profile.profilePic
          ? `${MEDIA_URL.replace(/\/$/, "")}/${profile.profilePic.replace(/^\//, "")}`
          : undefined,
      });
    }
  }, [profile]);

  // Direct upload from the avatar itself (camera icon) — skips the full
  // Edit Profile modal for the single most common edit. Reuses the same
  // partial-update endpoint; only the profilePic field is sent.
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("profilePic", file);
      const updated = await updateJobseekerProfile(fd);
      setProfile(updated.jobseeker);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setAvatarError("Upload failed. Please try a smaller image (under 2MB) in JPG, PNG, GIF, or WEBP.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const fd = new FormData();
      fd.append("name", formState.name);
      fd.append("skills", formState.skills);
      fd.append("qualifications", JSON.stringify(formState.qualifications));
      fd.append("experiences", JSON.stringify(formState.experiences));
      fd.append("projects", JSON.stringify(formState.projects));
      fd.append("certifications", JSON.stringify(formState.certifications));
      if (formState.profilePic) fd.append("profilePic", formState.profilePic);
      if (formState.resume) fd.append("resume", formState.resume);
      const updated = await updateJobseekerProfile(fd);
      setProfile(updated.jobseeker);
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const addQualification = () =>
    setFormState((p) => ({ ...p, qualifications: [...p.qualifications, { degree: "", institution: "", year: new Date().getFullYear() }] }));

  const removeQualification = (index: number) =>
    setFormState((p) => ({ ...p, qualifications: p.qualifications.filter((_, i) => i !== index) }));

  const handleQualificationChange = (index: number, updated: Qualification) =>
    setFormState((p) => { const q = [...p.qualifications]; q[index] = updated; return { ...p, qualifications: q }; });

  const addExperience = () =>
    setFormState((p) => ({ ...p, experiences: [...p.experiences, { jobPosition: "", institution: "", duration: "", companyId: null, current: false }] }));

  const removeExperience = (index: number) =>
    setFormState((p) => ({ ...p, experiences: p.experiences.filter((_, i) => i !== index) }));

  const handleExperienceChange = (index: number, updated: Experience) =>
    setFormState((p) => { const e = [...p.experiences]; e[index] = updated; return { ...p, experiences: e }; });

  const addProject = () =>
    setFormState((p) => ({ ...p, projects: [...p.projects, { title: "", description: "", link: "", technologies: "" }] }));

  const removeProject = (index: number) =>
    setFormState((p) => ({ ...p, projects: p.projects.filter((_, i) => i !== index) }));

  const handleProjectChange = (index: number, updated: Project) =>
    setFormState((p) => { const list = [...p.projects]; list[index] = updated; return { ...p, projects: list }; });

  const addCertification = () =>
    setFormState((p) => ({ ...p, certifications: [...p.certifications, { name: "", issuer: "", year: "" }] }));

  const removeCertification = (index: number) =>
    setFormState((p) => ({ ...p, certifications: p.certifications.filter((_, i) => i !== index) }));

  const handleCertificationChange = (index: number, updated: Certification) =>
    setFormState((p) => { const list = [...p.certifications]; list[index] = updated; return { ...p, certifications: list }; });

  if (!profile) return <div className="p-6">Loading profile...</div>;

  const mediaUrl = (p?: string) => p ? `${MEDIA_URL.replace(/\/$/, "")}/${p.replace(/^\//, "")}` : "";

  // "Recently working" highlight: prefer an experience explicitly marked
  // current; fall back to the most recently added entry so older profiles
  // (saved before the `current` flag existed) still show something useful.
  const currentJob: Experience | null =
    profile.experiences?.find((e) => e.current) ||
    (profile.experiences && profile.experiences.length > 0
      ? profile.experiences[profile.experiences.length - 1]
      : null);

  const experienceCompanyLink = (exp: Experience) => {
    if (!exp.companyId) return exp.institution;
    return React.createElement(
      "a",
      {
        href: "/community/company/" + exp.companyId,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "text-primary font-medium hover:underline",
      },
      exp.institution
    );
  };

  const resumeDownloadButton = profile.resume
    ? React.createElement(
        "a",
        {
          href: mediaUrl(profile.resume),
          target: "_blank",
          rel: "noopener noreferrer",
        },
        React.createElement(
          "button",
          { className: "flex items-center text-white bg-primary px-4 py-2 rounded-md hover:bg-primary/90" },
          React.createElement(Download, { size: 16, className: "mr-2" }),
          "Download CV"
        )
      )
    : React.createElement(
        "div",
        { className: "bg-gray-500 flex items-center px-4 py-1 rounded-md" },
        React.createElement("p", { className: "text-white py-2" }, "No resume uploaded")
      );

  return (
    <div className="bg-gray-50 px-4 py-8 sm:px-8 sm:py-12 lg:p-20 overflow-auto" style={{ maxHeight: "calc(100vh - 50px)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-5 sm:p-8 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* Left column — avatar */}
            <div className="text-center">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 group">
                <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center ring-2 ring-white shadow-sm">
                  {profile.profilePic ? (
                    <img src={mediaUrl(profile.profilePic)} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-500">{profile.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Camera overlay — the actual "upload a photo" affordance.
                    Fades in on hover (desktop); the whole circle stays
                    clickable regardless, and the persistent badge below
                    covers discoverability on touch devices that have no
                    hover state. Always shown mid-upload. */}
                <label
                  className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white
                    transition-opacity cursor-pointer
                    ${avatarUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title="Change profile picture"
                >
                  {avatarUploading ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : (
                    <Camera size={22} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={avatarUploading}
                    onChange={handleAvatarChange}
                  />
                </label>

                {/* Small always-visible badge so the option is discoverable
                    without needing to hover first (mirrors the overlay's
                    icon, just persistent). */}
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow ring-2 ring-white pointer-events-none">
                  <Camera size={13} />
                </span>
              </div>
              {avatarError && (
                <p className="text-xs text-red-600 mb-2 max-w-[14rem] mx-auto">{avatarError}</p>
              )}
              <h2 className="text-xl sm:text-2xl font-semibold break-words">{profile.name}</h2>
              {/* Career status replaces the generic "Jobseeker" role label
                  here — the account role itself is unaffected everywhere
                  it's used for authorization (this is a display-only
                  change; see profile.role, still used elsewhere as-is). */}
              <div className="mt-1.5 flex justify-center">
                <ProfileStatusBadge
                  profileStatus={profile.profileStatus}
                  editable
                  onEdit={() => setShowStatusEditor(true)}
                />
              </div>
              <p className="text-primary text-sm sm:text-base break-all mt-1.5">{profile.email}</p>

              {/* Currently working at — the "recently working" highlight */}
              {currentJob && (currentJob.jobPosition || currentJob.institution) && (
                <div className="mt-4 inline-flex w-full items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left">
                  <Building2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                      {profile.experiences?.some((e) => e.current) ? "Currently working at" : "Recently worked at"}
                    </p>
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {currentJob.jobPosition || "—"}
                    </p>
                    <p className="truncate text-xs text-gray-600">
                      {experienceCompanyLink(currentJob)}
                    </p>
                  </div>
                </div>
              )}

              {/* Followers / Following — reuses the Community follow system;
                  clicking through lands on the same pages linked from the
                  Community Profile header. */}
              <div className="flex justify-center gap-6 mt-4 py-3 border-y border-gray-100">
                <Link
                  to={`/community/profile/${profile._id}/followers`}
                  className="flex flex-col items-center hover:text-primary transition-colors group"
                >
                  <span className="text-base font-bold text-gray-900 group-hover:text-primary">{followCounts.followers}</span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1"><UserPlus size={10} /> Followers</span>
                </Link>
                <Link
                  to={`/community/profile/${profile._id}/following`}
                  className="flex flex-col items-center hover:text-primary transition-colors group"
                >
                  <span className="text-base font-bold text-gray-900 group-hover:text-primary">{followCounts.following}</span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1"><Users size={10} /> Following</span>
                </Link>
              </div>

              {/* Only real, saved links are shown — no dead placeholder icons.
                  Edit these from "Edit Profile" (backed by User.socialLinks,
                  the same field the Community Profile page reads). */}
              {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
                <div className="flex justify-center space-x-4 mt-4">
                  {profile.socialLinks.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600">
                      <Linkedin size={20} />
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-sky-500">
                      <Twitter size={20} />
                    </a>
                  )}
                  {profile.socialLinks.github && (
                    <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900">
                      <Github size={20} />
                    </a>
                  )}
                  {profile.socialLinks.website && (
                    <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary">
                      <Globe size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right column — details */}
            <div className="md:col-span-2 flex flex-col justify-between relative">
              <button onClick={() => setShowEditModal(true)} className="absolute top-0 right-0 p-2 text-gray-500 hover:text-primary">
                <Pencil size={20} />
              </button>

              {/* Qualifications */}
              <div className="pr-10">
                <div className="flex items-center mb-2 text-lg sm:text-xl font-semibold text-gray-800">
                  <GraduationCap className="mr-2 shrink-0 text-primary" size={32} /> Qualifications
                </div>
                {profile.qualifications?.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {profile.qualifications.map((q, i) => (
                      <li key={i}>
                        <p className="font-semibold text-base sm:text-lg">{q.degree}</p>
                        {q.institution} <br /> {q.year}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No qualifications added.</p>
                )}
              </div>

              {/* Skills */}
              <div className="mt-6">
                <div className="flex items-center mb-2 text-base sm:text-lg font-semibold text-gray-800">
                  <BadgeCheck className="mr-2 shrink-0 text-primary" size={26} /> Skills
                </div>
                {profile.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 border text-sm rounded-full">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No skills added.</p>
                )}
              </div>

              {/* Experience */}
              <div className="mt-6">
                <div className="flex items-center mb-2 text-base sm:text-lg font-semibold text-gray-800">
                  <Briefcase className="mr-2 shrink-0 text-primary" size={26} /> Experience
                </div>
                {profile.experiences?.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {profile.experiences.map((exp, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <strong>{exp.jobPosition}</strong>
                        <span>at {experienceCompanyLink(exp)}</span>
                        <span className="text-gray-500">— {exp.duration}</span>
                        {exp.current && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Current
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No experience added.</p>
                )}
              </div>

              {/* Projects */}
              <div className="mt-6">
                <div className="flex items-center mb-2 text-base sm:text-lg font-semibold text-gray-800">
                  <Briefcase className="mr-2 shrink-0 text-primary" size={26} /> Projects
                </div>
                {profile.projects && profile.projects.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {profile.projects.map((p, i) => (
                      <li key={i}>
                        <p className="font-semibold">{p.title}</p>
                        {p.description && <p className="text-gray-600">{p.description}</p>}
                        {p.technologies && <p className="text-xs text-gray-500">{p.technologies}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No projects added.</p>
                )}
              </div>

              {/* Certifications */}
              <div className="mt-6">
                <div className="flex items-center mb-2 text-base sm:text-lg font-semibold text-gray-800">
                  <BadgeCheck className="mr-2 shrink-0 text-primary" size={26} /> Certifications
                </div>
                {profile.certifications && profile.certifications.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {profile.certifications.map((c, i) => (
                      <li key={i}>
                        <span className="font-semibold">{c.name}</span>
                        {(c.issuer || c.year) && <span className="text-gray-500"> — {[c.issuer, c.year].filter(Boolean).join(", ")}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No certifications added.</p>
                )}
              </div>

              {/* Resume download */}
              <div className="mt-8 flex justify-center md:justify-end">
                {resumeDownloadButton}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSave}
        formState={formState}
        setFormState={setFormState}
        addQualification={addQualification}
        removeQualification={removeQualification}
        handleQualificationChange={handleQualificationChange}
        addExperience={addExperience}
        removeExperience={removeExperience}
        handleExperienceChange={handleExperienceChange}
        addProject={addProject}
        removeProject={removeProject}
        handleProjectChange={handleProjectChange}
        addCertification={addCertification}
        removeCertification={removeCertification}
        handleCertificationChange={handleCertificationChange}
      />

      <ProfileStatusEditor
        open={showStatusEditor}
        onClose={() => setShowStatusEditor(false)}
        statusType="JOB_SEEKER"
        currentStatus={profile.profileStatus}
        onSave={(payload) => updateJobseekerCareerStatus(payload).then((res) => res.profileStatus)}
        onSaved={(updated) => setProfile((p) => (p ? { ...p, profileStatus: updated } : p))}
      />
    </div>
  );
};

export default UserProfile;