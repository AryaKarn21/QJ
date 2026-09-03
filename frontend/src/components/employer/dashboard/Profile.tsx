import { useEffect, useState } from "react";
import {
  Linkedin,
  Facebook,
  Twitter,
  Building2,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Users,
  BadgeInfo,
  BadgeCheck,
  XCircle,
  Pencil,
  Globe,
  Briefcase,
  PlusCircle,
  BarChart3,
  UserCheck,
  Eye,
  FileText,
  Sparkles,
  ArrowUpRight,
  Camera,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getEmployerProfile, updateEmployerProfile, getEmployerDashboardStats, updateEmployerHiringStatusApi } from "../employerApi/api";
import { fetchFollowCounts } from "../../../api/followApi";
import EditProfileModal from "./EditProfileModal";
import ImageCropModal from "../../common/ImageCropModal";
import { ProfileStatusBadge } from "../../common/profileStatus/ProfileStatusBadge";
import { ProfileStatusEditor } from "../../common/profileStatus/ProfileStatusEditor";
import type { ProfileStatus } from "../../../types/profileStatus";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const navigate = useNavigate();

  // Direct-upload state for the logo and cover photo — same adjustable
  // crop/zoom flow as the jobseeker profile's avatar/cover, so employers
  // get the same quick, discoverable upload affordance instead of only
  // finding logo/cover fields buried inside the full Edit Profile modal.
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getEmployerProfile();
        // Dashboard stats (jobs posted, active jobs, applications, views)
        // live on a separate endpoint, not on the User document — merge
        // them in so the KPI cards on this page have something to read.
        let stats = {};
        try {
          stats = await getEmployerDashboardStats();
        } catch (statsError) {
          console.error("Failed to fetch dashboard stats:", statsError);
        }
        setProfile({ ...data, ...stats });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Reuses the Community module's existing follow-counts endpoint (same
  // one the Community Profile page's header uses) rather than duplicating
  // that logic here.
  useEffect(() => {
    if (!profile?._id) return;
    fetchFollowCounts(profile._id)
      .then((c) => setFollowCounts({ followers: c.followers, following: c.following }))
      .catch(() => {});
  }, [profile?._id]);

  const mediaUrl = (p?: string) => (p ? `${MEDIA_URL.replace(/\/$/, "")}/${p.replace(/^\//, "")}` : "");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError(null);
    setPendingLogoFile(file);
  };

  const handleLogoCropConfirm = async (blob: Blob) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("companyLogo", new File([blob], "logo.jpg", { type: "image/jpeg" }));
      const updated = await updateEmployerProfile(fd);
      setProfile((p: any) => ({ ...p, ...updated }));
      setPendingLogoFile(null);
    } catch (error) {
      console.error("Error uploading company logo:", error);
      setLogoError("Upload failed. Please try a smaller image (under 2MB) in JPG, PNG, GIF, or WEBP.");
      setPendingLogoFile(null);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverError(null);
    setPendingCoverFile(file);
  };

  const handleCoverCropConfirm = async (blob: Blob) => {
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("coverPhoto", new File([blob], "cover.jpg", { type: "image/jpeg" }));
      const updated = await updateEmployerProfile(fd);
      setProfile((p: any) => ({ ...p, ...updated }));
      setPendingCoverFile(null);
    } catch (error) {
      console.error("Error uploading cover photo:", error);
      setCoverError("Upload failed. Please try a smaller image (under 2MB) in JPG, PNG, GIF, or WEBP.");
      setPendingCoverFile(null);
    } finally {
      setCoverUploading(false);
    }
  };

  // Calculate Profile Completion Percentage
  const calculateProfileCompletion = (prof: any) => {
    if (!prof) return 0;
    const fields = [
      "name",
      "email",
      "companyLogo",
      "industryType",
      "address",
      "telephone",
      "panNumber",
      "companySize",
      "establishedDate",
      "description",
      "website",
    ];
    let completed = 0;
    fields.forEach((field) => {
      if (prof[field] && prof[field].toString().trim() !== "") {
        completed += 1;
      }
    });
    return Math.round((completed / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="bg-[#FFF8F3] min-h-[calc(100vh-50px)] p-6 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-6xl space-y-6 animate-pulse">
          <div className="h-48 bg-white/80 rounded-2xl border border-orange-100 shadow-sm" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-white/80 rounded-2xl border border-orange-100 shadow-sm" />
            <div className="lg:col-span-2 space-y-6">
              <div className="h-44 bg-white/80 rounded-2xl border border-orange-100 shadow-sm" />
              <div className="h-64 bg-white/80 rounded-2xl border border-orange-100 shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#FFF8F3] min-h-[calc(100vh-50px)] p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 text-center max-w-md">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Failed to load profile</h2>
          <p className="text-slate-500 text-sm mt-1 mb-4">
            We couldn't retrieve your company details. Please try refreshing or re-logging in.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#F97316] text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = calculateProfileCompletion(profile);

  return (
    <div className="bg-[#FFF8F3] p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-50px)] overflow-y-auto selection:bg-orange-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HERO SECTION */}
        <div className="relative bg-white rounded-3xl border border-orange-100/80 shadow-sm overflow-hidden transition-all">
          {/* Header Orange Gradient Banner */}
         <div className="h-32 sm:h-40 relative overflow-hidden">
  {profile.coverPhoto ? (
    <img
      src={mediaUrl(profile.coverPhoto)}
      alt="Cover"
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]" />
    </div>
  )}

  {/* Cover photo uploader — direct affordance on the banner itself
      rather than only being reachable through the full Edit Profile
      modal further down. */}
  <label
    className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur-sm border border-white/40 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-black/40 transition-colors cursor-pointer"
    title={profile.coverPhoto ? "Change cover photo" : "Add a cover photo"}
  >
    {coverUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
    <span className="hidden sm:inline">{profile.coverPhoto ? "Change cover" : "Add cover"}</span>
    <input
      type="file"
      accept="image/*"
      className="sr-only"
      disabled={coverUploading}
      onChange={handleCoverChange}
    />
  </label>

  {coverError && (
    <p className="absolute bottom-2 left-3 right-3 text-[11px] text-white bg-red-600/90 rounded px-2 py-1">
      {coverError}
    </p>
  )}
</div>

          <div className="px-6 sm:px-8 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              
              {/* Company Logo / Gradient Initial Avatar */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white p-1.5 shadow-md border border-orange-100 shrink-0 overflow-hidden">
                  {profile.companyLogo ? (
                    <img
                      src={mediaUrl(profile.companyLogo)}
                      alt={profile.name}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-extrabold shadow-inner">
                      {profile.name?.charAt(0).toUpperCase() || "C"}
                    </div>
                  )}
                </div>

                {/* Camera overlay — the actual "upload a logo" affordance,
                    same pattern as the jobseeker avatar: fades in on hover,
                    whole box stays clickable regardless, small persistent
                    badge covers discoverability on touch devices. */}
                <label
                  className={`absolute inset-1.5 rounded-xl flex items-center justify-center bg-black/50 text-white
                    transition-opacity cursor-pointer
                    ${logoUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title="Change company logo"
                >
                  {logoUploading ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={logoUploading}
                    onChange={handleLogoChange}
                  />
                </label>
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316] text-white shadow ring-2 ring-white pointer-events-none">
                  <Camera size={13} />
                </span>
                {logoError && (
                  <p className="absolute top-full mt-1 left-0 right-0 text-[11px] text-red-600 bg-white/90 rounded px-1.5 py-1 shadow-sm">
                    {logoError}
                  </p>
                )}
              </div>

              {/* Edit Profile Action Button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50/80 hover:bg-orange-100 text-[#F97316] font-semibold text-sm transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs self-end"
                title="Edit Employer Profile"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Company Main Details */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {profile.name}
                </h1>

                {/* Verified Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    profile.isVerified
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {profile.isVerified ? (
                    <>
                      <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Verified Employer</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Pending Verification</span>
                    </>
                  )}
                </div>

                {/* Hiring status replaces the generic "Employer" role
                    label the spec asks for — this page didn't previously
                    show a role label at all, so this is a pure addition
                    alongside the existing Verified badge. */}
                <ProfileStatusBadge
                  profileStatus={profile.profileStatus}
                  editable
                  onEdit={() => setShowStatusEditor(true)}
                />
              </div>

              {profile.industryType ? (
                <p className="text-sm font-semibold text-[#F97316] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span>{profile.industryType}</span>
                </p>
              ) : (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs font-medium text-[#F97316] hover:underline"
                >
                  + Add Industry
                </button>
              )}
            </div>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-orange-100/80 shadow-xs hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Jobs Posted
              </span>
              <div className="p-2 rounded-xl bg-orange-50 text-[#F97316] group-hover:scale-110 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              {profile.jobsPostedCount ?? profile.jobsCount ?? "--"}
            </p>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              Total lifetime postings
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-orange-100/80 shadow-xs hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Jobs
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              {profile.activeJobsCount ?? "--"}
            </p>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              Currently accepting applications
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-orange-100/80 shadow-xs hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Applications
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              {profile.totalApplicationsCount ?? profile.applicationsCount ?? "--"}
            </p>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              Total candidate submissions
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-orange-100/80 shadow-xs hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Profile Views
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              {profile.profileViews ?? "--"}
            </p>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              Candidate profile visits
            </span>
          </div>
        </div>

        {/* TWO-COLUMN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDEBAR COLUMN */}
          <div className="space-y-6">

            {/* Profile Completion Card */}
            <div className="bg-white p-6 rounded-3xl border border-orange-100/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Profile Completion
                </h3>
                <span className="text-xs font-extrabold text-[#F97316]">
                  {completionPercentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Complete your company profile to improve candidate trust and boost application conversion rates.
              </p>

              {completionPercentage < 100 && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-[#F97316] font-semibold text-xs rounded-xl transition-all text-center cursor-pointer"
                >
                  Complete Profile Info
                </button>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white p-6 rounded-3xl border border-orange-100/80 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Employer Quick Actions
              </h3>

              <button
                onClick={() => navigate("/employer/postjob")}
                className="w-full py-2.5 px-4 bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  <span>Post New Job</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => navigate("/employer/joblist")}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <span>Manage Jobs</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => navigate("/employer/applicants")}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span>View Applicants</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => navigate("/employer/insight")}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>Analytics Dashboard</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Community Followers / Following Card */}
            <div className="bg-white p-6 rounded-3xl border border-orange-100/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4">
                Community Network
              </h3>
              <div className="flex items-center gap-3">
                <Link
                  to={`/community/profile/${profile._id}/followers`}
                  className="flex-1 flex flex-col items-center rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 py-3 transition-all"
                >
                  <span className="text-lg font-bold text-slate-900">{followCounts.followers}</span>
                  <span className="text-[11px] font-medium text-slate-500">Followers</span>
                </Link>
                <Link
                  to={`/community/profile/${profile._id}/following`}
                  className="flex-1 flex flex-col items-center rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 py-3 transition-all"
                >
                  <span className="text-lg font-bold text-slate-900">{followCounts.following}</span>
                  <span className="text-[11px] font-medium text-slate-500">Following</span>
                </Link>
              </div>
            </div>

            {/* Social Channels Card */}
            <div className="bg-white p-6 rounded-3xl border border-orange-100/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4">
                Social Channels
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={profile.linkedinUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-500 hover:text-[#F97316] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  title="LinkedIn"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href={profile.facebookUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-500 hover:text-[#F97316] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  title="Facebook"
                  aria-label="Facebook Profile"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href={profile.twitterUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-500 hover:text-[#F97316] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  title="Twitter"
                  aria-label="Twitter Profile"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>

          </div>

          {/* MAIN CONTENT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* COMPANY INFORMATION CARDS */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-orange-100/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Company Information
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verified organization metadata visible to candidate jobseekers.
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs font-semibold text-[#F97316] hover:underline"
                >
                  Edit Information
                </button>
              </div>

              {/* Grid Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Email Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Work Email
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate pl-8">
                    {profile.email || "Not available"}
                  </p>
                </div>

                {/* Telephone Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Telephone
                    </span>
                  </div>
                  <div className="pl-8">
                    {profile.telephone ? (
                      <p className="text-sm font-semibold text-slate-900">
                        {profile.telephone}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
                      >
                        + Add phone number
                      </button>
                    )}
                  </div>
                </div>

                {/* Address Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Company Address
                    </span>
                  </div>
                  <div className="pl-8">
                    {profile.address ? (
                      <p className="text-sm font-semibold text-slate-900">
                        {profile.address}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
                      >
                        + Add company address
                      </button>
                    )}
                  </div>
                </div>

                {/* Company Size Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Company Size
                    </span>
                  </div>
                  <div className="pl-8">
                    {profile.companySize ? (
                      <p className="text-sm font-semibold text-slate-900">
                        {profile.companySize} Employees
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
                      >
                        + Add company size
                      </button>
                    )}
                  </div>
                </div>

                {/* PAN Number Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <BadgeInfo className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      PAN Number
                    </span>
                  </div>
                  <div className="pl-8">
                    {profile.panNumber ? (
                      <p className="text-sm font-semibold text-slate-900 font-mono tracking-wide">
                        {profile.panNumber}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
                      >
                        + Add PAN number
                      </button>
                    )}
                  </div>
                </div>

                {/* Established Date Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Established Date
                    </span>
                  </div>
                  <div className="pl-8">
                    {profile.establishedDate ? (
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(profile.establishedDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
                      >
                        + Add established date
                      </button>
                    )}
                  </div>
                </div>

                {/* Website Card (Full width on sm) */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-orange-100/80 text-[#F97316]">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Website
                    </span>
                  </div>
                  <div className="pl-8">
                    {profile.website ? (
                      <a
                        href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[#F97316] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{profile.website}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="text-xs font-medium text-[#F97316] hover:underline cursor-pointer"
                      >
                        + Add company website
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* ABOUT COMPANY / DESCRIPTION CARD */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-orange-100/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F97316]" />
                  <h2 className="text-lg font-bold text-slate-900">
                    About Company
                  </h2>
                </div>
              </div>

              {profile.description ? (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {profile.description}
                </p>
              ) : (
                <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <p className="text-slate-500 text-sm mb-2">
                    No company overview provided yet.
                  </p>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add company description</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* EDIT PROFILE MODAL INTEGRATION */}
        <EditProfileModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
          onSave={async (updatedFields) => {
            try {
              const formData = new FormData();
              for (const key in updatedFields) {
                formData.append(key, updatedFields[key]);
              }

              const updated = await updateEmployerProfile(formData);
              // Merge, don't replace — `updated` only carries employer
              // document fields, not the dashboard stats (jobsPostedCount,
              // activeJobsCount, ...) merged in from a separate endpoint on
              // initial load; a plain replace here reset the KPI cards to
              // "--" after every single profile edit.
              setProfile((p: any) => ({ ...p, ...updated }));
              setShowEditModal(false);
            } catch (error) {
              console.error("Failed to update profile:", error);
            }
          }}
        />

        <ProfileStatusEditor
          open={showStatusEditor}
          onClose={() => setShowStatusEditor(false)}
          statusType="EMPLOYER"
          currentStatus={profile?.profileStatus as ProfileStatus | null | undefined}
          onSave={(payload) => updateEmployerHiringStatusApi(payload).then((res) => res.profileStatus)}
          onSaved={(updated) => setProfile((p: Record<string, unknown> | null) => (p ? { ...p, profileStatus: updated } : p))}
        />

        {pendingLogoFile && (
          <ImageCropModal
            file={pendingLogoFile}
            busy={logoUploading}
            shape="rect"
            title="Adjust your company logo"
            onCancel={() => setPendingLogoFile(null)}
            onConfirm={handleLogoCropConfirm}
          />
        )}

        {pendingCoverFile && (
          <ImageCropModal
            file={pendingCoverFile}
            busy={coverUploading}
            aspect={3}
            shape="rect"
            title="Adjust your cover photo"
            onCancel={() => setPendingCoverFile(null)}
            onConfirm={handleCoverCropConfirm}
          />
        )}

      </div>
    </div>
  );
};

export default Profile;