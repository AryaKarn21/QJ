import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createJob, getSingleJob, editJob, getEmployerProfile, fetchCountries } from "../employerApi/api";
import { fetchJobCategories } from "../../../api/jobCategoryApi";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  CalendarClock, Check, ChevronLeft, ChevronRight, Building2, Pencil,
  Globe, Linkedin, Target, Heart, MapPin, Gift, Users, Calendar, ExternalLink,
} from "lucide-react";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

// LinkedIn/Naukri-style posting flow (section 12): Job Details ->
// Requirements -> Company -> Compensation -> Preview -> Publish. Every
// field below already existed as a flat form (Phase 1) — this is a
// reorganization into steps, not a new set of fields or a new API.
const STEPS = ["Job Details", "Requirements", "Company", "Compensation", "Preview", "Publish"];

const EMPTY_FORM = {
  title: "",
  country: "",
  location: "",
  jobtype: "",
  salary: "",
  experience: "",
  jobcategory: "",
  level: "",
  deadline: "",
  openings: 1,
  description: "",
  department: "",
  workMode: "On-site",
  minExperience: "",
  maxExperience: "",
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: "Yearly",
  currency: "NPR",
  overview: "",
  education: "",
  workingHours: "",
  responsibilities: "",
  requirements: "",
  requiredSkills: "",
  preferredSkills: "",
  benefits: "",
  perks: "",
  // Per-job company override (backend/models/Job.js's companyOverride) —
  // off by default, so every job just auto-attaches the employer's real
  // Company Profile (Phase 1/3) unless explicitly turned on.
  useCompanyOverride: false,
  overrideName: "",
  overrideTagline: "",
};

const toCsv = (arr: unknown) => (Array.isArray(arr) ? arr.join(", ") : "");
const toStr = (n: unknown) => (n === undefined || n === null ? "" : String(n));
const toArray = (csv: string) => csv.split(",").map((s) => s.trim()).filter(Boolean);
const toNumberOrUndefined = (s: string) => (s.trim() === "" ? undefined : Number(s));

const inputCls = "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 font-medium";

const PostJob = () => {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  // "Duplicate" (JobList.tsx) lands here without a :jobId — it just
  // pre-fills the create form from an existing job's data. isEdit stays
  // false, so submitting always creates a brand-new job.
  const duplicateFrom = searchParams.get("duplicateFrom");
  const navigate = useNavigate();
  const isEdit = Boolean(jobId);

  const todayStr = new Date().toISOString().split("T")[0];

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [sourceStatus, setSourceStatus] = useState<string | undefined>(undefined);

  const { data: jobData, isLoading: isFetching } = useQuery({
    queryKey: ["job", jobId || duplicateFrom],
    queryFn: () => getSingleJob((jobId || duplicateFrom) as string),
    enabled: !!(jobId || duplicateFrom),
  });

  // Real, admin-managed categories — see fetchJobCategories's own comment.
  const { data: categories = [] } = useQuery({
    queryKey: ["jobCategories"],
    queryFn: fetchJobCategories,
  });

  // The same list backend/models/Job.js's `country` enum validates
  // against (backend/data/countries.js) — this used to be a hand-typed
  // 6-option list that couldn't reach ~190 of the countries the backend
  // actually accepts.
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: Infinity, // a static reference list — no reason to refetch
  });

  // The "Company" step previews the employer's own Company Profile
  // (Phase 1/3) so they can see exactly what auto-attaches to this job
  // before deciding whether they need a per-job override.
  const { data: companyProfile } = useQuery({
    queryKey: ["employerProfile"],
    queryFn: getEmployerProfile,
  });

  useEffect(() => {
    if (!jobData) return;
    setSourceStatus(jobData.status);
    setFormData((prev) => ({
      ...prev,
      ...jobData,
      // Duplicating: this is a NEW posting, so it shouldn't inherit the
      // source job's deadline/openings-filled-count baggage — start the
      // deadline blank so the employer picks a fresh one.
      deadline: isEdit && jobData.deadline ? new Date(jobData.deadline).toISOString().split("T")[0] : "",
      openings: jobData.openings || 1,
      workMode: jobData.workMode || "On-site",
      salaryPeriod: jobData.salaryPeriod || "Yearly",
      currency: jobData.currency || "NPR",
      minExperience: toStr(jobData.minExperience),
      maxExperience: toStr(jobData.maxExperience),
      salaryMin: toStr(jobData.salaryMin),
      salaryMax: toStr(jobData.salaryMax),
      responsibilities: toCsv(jobData.responsibilities),
      requirements: toCsv(jobData.requirements),
      requiredSkills: toCsv(jobData.requiredSkills),
      preferredSkills: toCsv(jobData.preferredSkills),
      benefits: toCsv(jobData.benefits),
      perks: toCsv(jobData.perks),
      useCompanyOverride: !!(jobData.companyOverride?.name || jobData.companyOverride?.tagline),
      overrideName: jobData.companyOverride?.name || "",
      overrideTagline: jobData.companyOverride?.tagline || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobData]);

  const buildPayload = (isDraft: boolean) => {
    const payload: Record<string, unknown> = {
      ...formData,
      openings: Number(formData.openings) || 1,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
      minExperience: toNumberOrUndefined(formData.minExperience),
      maxExperience: toNumberOrUndefined(formData.maxExperience),
      salaryMin: toNumberOrUndefined(formData.salaryMin),
      salaryMax: toNumberOrUndefined(formData.salaryMax),
      responsibilities: toArray(formData.responsibilities),
      requirements: toArray(formData.requirements),
      requiredSkills: toArray(formData.requiredSkills),
      preferredSkills: toArray(formData.preferredSkills),
      benefits: toArray(formData.benefits),
      perks: toArray(formData.perks),
      companyOverride: formData.useCompanyOverride
        ? { name: formData.overrideName.trim(), tagline: formData.overrideTagline.trim() }
        : { name: "", logo: "", tagline: "" },
    };
    delete payload.useCompanyOverride;
    delete payload.overrideName;
    delete payload.overrideTagline;
    // `formData` inherited a `status` key from `...jobData` when editing/
    // duplicating (see the load effect above) — drop it unconditionally
    // first. Forwarding it unintentionally would make editJob see
    // `req.body.status !== undefined` on every save and reject it with
    // "Only an admin can approve or reject a job" for anything not
    // Active/Inactive (e.g. a Pending or Rejected job), even though the
    // employer never touched status at all.
    delete payload.status;

    if (isDraft) {
      payload.status = "Draft";
    } else if (isEdit && sourceStatus === "Draft") {
      // Publishing an existing draft — the one status transition an
      // employer can make themselves (see employerController.js's editJob).
      payload.status = "Pending";
    }
    // Otherwise: creating fresh (backend defaults to Pending) or editing a
    // non-draft job (never send `status` here — that's Close/Reopen's job
    // on the dashboard list, not this form).
    return payload;
  };

  const mutation = useMutation({
    mutationFn: ({ isDraft }: { isDraft: boolean }) => {
      const payload = buildPayload(isDraft);
      return isEdit ? editJob(jobId!, payload) : createJob(payload);
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.isDraft
          ? "Draft saved. You can finish it any time from your job list."
          : isEdit
          ? "Job updated successfully."
          : "Job submitted for review."
      );
      navigate("/employer/dashboard");
    },
    onError: (error: { response?: { data?: { errors?: string[]; message?: string } } }) => {
      console.error("Job save failed:", error);
      const data = error?.response?.data;
      const message = data?.errors?.join(", ") || data?.message || "Failed to save job.";
      toast.error(message);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const REQUIRED_FOR_PUBLISH: { field: keyof typeof EMPTY_FORM; label: string; step: number }[] = [
    { field: "title", label: "Job title", step: 0 },
    { field: "country", label: "Country", step: 0 },
    { field: "location", label: "Location", step: 0 },
    { field: "jobtype", label: "Job type", step: 0 },
    { field: "jobcategory", label: "Job category", step: 0 },
    { field: "level", label: "Job level", step: 0 },
    { field: "deadline", label: "Application deadline", step: 0 },
    { field: "description", label: "Job description", step: 1 },
    { field: "salary", label: "Salary", step: 3 },
  ];

  const handleSaveDraft = () => {
    if (!formData.title.trim()) {
      toast.error("Give the draft at least a title before saving.");
      return;
    }
    mutation.mutate({ isDraft: true });
  };

  const handlePublish = () => {
    if (formData.deadline && formData.deadline < todayStr) {
      toast.error("Application deadline must be today or a future date.");
      setStep(0);
      return;
    }
    for (const { field, label, step: fieldStep } of REQUIRED_FOR_PUBLISH) {
      if (!String(formData[field]).trim()) {
        toast.error(`${label} is required before publishing.`);
        setStep(fieldStep);
        return;
      }
    }
    mutation.mutate({ isDraft: false });
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  if ((isEdit || duplicateFrom) && isFetching) return <div className="p-10 text-center text-gray-500">Loading job data...</div>;

  const displayCompanyName = formData.useCompanyOverride && formData.overrideName ? formData.overrideName : companyProfile?.name;
  const displayCompanyTagline = formData.useCompanyOverride && formData.overrideTagline ? formData.overrideTagline : companyProfile?.headline;

  return (
    <div className="min-h-screen overflow-auto bg-gray-50 py-8" style={{ maxHeight: "calc(100vh - 50px)" }}>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-1">
          {isEdit ? "Edit Job" : duplicateFrom ? "Duplicate Job" : "Post a Job"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {sourceStatus === "Draft" && isEdit ? "Continuing a saved draft — " : ""}
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        {/* Step indicator */}
        <div className="flex items-center mb-8 overflow-x-auto">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < step ? "bg-primary text-white" : i === step ? "border-2 border-primary text-primary" : "border border-gray-300 text-gray-400"
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </span>
                <span className={`text-[11px] whitespace-nowrap ${i === step ? "font-semibold text-primary" : "text-gray-400"}`}>{label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 min-w-6 mx-1 ${i < step ? "bg-primary" : "bg-gray-200"}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Step 1: Job Details */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Job Title *</label>
                <input name="title" placeholder="e.g. Software Engineer" value={formData.title} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Department (Optional)</label>
                <input name="department" placeholder="e.g. Engineering" value={formData.department} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Job Category *</label>
                <select name="jobcategory" value={formData.jobcategory} onChange={handleChange} className={inputCls}>
                  <option value="">Select a category</option>
                  {formData.jobcategory && !categories.some((c) => c.name === formData.jobcategory) && (
                    <option value={formData.jobcategory}>{formData.jobcategory}</option>
                  )}
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Job Level *</label>
                <select name="level" value={formData.level} onChange={handleChange} className={inputCls}>
                  <option value="">Select Level</option>
                  <option value="Internship">Internship</option>
                  <option value="Fresher">Fresher</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Job Type *</label>
                <select name="jobtype" value={formData.jobtype} onChange={handleChange} className={inputCls}>
                  <option value="">Select Job Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Hourly">Hourly</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Work Mode</label>
                <select name="workMode" value={formData.workMode} onChange={handleChange} className={inputCls}>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Country *</label>
                <select name="country" value={formData.country} onChange={handleChange} className={inputCls}>
                  <option value="">Select Country</option>
                  {/* A job being edited/duplicated may carry a country
                      value from before the list below loads — keep it
                      selectable rather than silently blanking the field. */}
                  {formData.country && !countries.includes(formData.country) && (
                    <option value={formData.country}>{formData.country}</option>
                  )}
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Location *</label>
                <input name="location" placeholder="e.g. Kathmandu" value={formData.location} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Openings</label>
                <input name="openings" type="number" min={1} value={formData.openings} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Application Deadline *</label>
                <div className="relative">
                  <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <input name="deadline" type="date" value={formData.deadline} onChange={handleChange} min={todayStr} className={`${inputCls} pl-10`} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Job Overview</label>
                <textarea name="overview" value={formData.overview} onChange={handleChange} rows={2} placeholder="A short summary shown at the top of the job page..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Job Description *</label>
                <div className="h-[220px]">
                  <ReactQuill
                    value={formData.description}
                    onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                    theme="snow"
                    className="h-[85%]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className={labelCls}>Responsibilities</label>
                  <textarea name="responsibilities" value={formData.responsibilities} onChange={handleChange} rows={3} placeholder="Comma-separated, e.g. Lead sprint planning, Review pull requests" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Requirements</label>
                  <textarea name="requirements" value={formData.requirements} onChange={handleChange} rows={3} placeholder="Comma-separated, e.g. 3+ years experience, Bachelor's degree" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Required Skills</label>
                  <input name="requiredSkills" value={formData.requiredSkills} onChange={handleChange} placeholder="Comma-separated, e.g. React, Node.js, SQL" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Preferred Skills</label>
                  <input name="preferredSkills" value={formData.preferredSkills} onChange={handleChange} placeholder="Comma-separated, e.g. AWS, GraphQL" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Education</label>
                  <input name="education" value={formData.education} onChange={handleChange} placeholder="e.g. Bachelor's in Computer Science" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Working Hours</label>
                  <input name="workingHours" value={formData.workingHours} onChange={handleChange} placeholder="e.g. 10 AM - 6 PM, Sun-Fri" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Company — everything below is auto-attached, read-only,
              from the employer's real Company Profile (Employer.js via
              getEmployerProfile) at publish time. Nothing here is copied
              onto the Job document — the job just carries an `employer`
              ref, and jobController.js's getJobById populates this same
              data fresh every time the job is viewed (see COMPANY_PROFILE_
              FIELDS), so editing the Company Profile later updates every
              job automatically. Only name/logo/tagline are overridable —
              the rest (industry, mission, benefits, etc.) describes the
              company itself, not this specific posting, so there's no
              legitimate per-job reason to fork it. */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-start gap-4">
                {companyProfile?.companyLogo ? (
                  <img src={`${MEDIA_URL.replace(/\/$/, "")}/${companyProfile.companyLogo.replace(/^\//, "")}`} alt="" className="h-14 w-14 rounded-full object-cover bg-white shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold shrink-0">
                    <Building2 size={22} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-0.5">This job will show</p>
                  <p className="font-semibold text-gray-800">{displayCompanyName || "Your company"}</p>
                  {displayCompanyTagline && <p className="text-sm text-gray-500">{displayCompanyTagline}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Company info comes from your Company Profile automatically — no need to retype it for every job.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="useCompanyOverride" checked={formData.useCompanyOverride} onChange={handleChange} />
                <Pencil size={14} className="text-gray-400" />
                Show different company name/tagline for this specific job
              </label>

              {formData.useCompanyOverride && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-6 border-l-2 border-primary/20">
                  <div>
                    <label className={labelCls}>Override Name</label>
                    <input name="overrideName" value={formData.overrideName} onChange={handleChange} placeholder={companyProfile?.name || "Company name"} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Override Tagline</label>
                    <input name="overrideTagline" value={formData.overrideTagline} onChange={handleChange} placeholder="Short line shown under the name" className={inputCls} />
                  </div>
                </div>
              )}

              {/* Read-only preview of the rest of the Company Profile —
                  exactly what jobseekers will see in "About the Company"
                  on the published job. Edited from the employer dashboard
                  (EditProfileModal.tsx), never here. */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={labelCls + " mb-0"}>About the Company (from your profile)</h3>
                  {/* Opens in a new tab rather than navigating away — the
                      employer is mid-way through this job form. */}
                  <a
                    href="/employer/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Edit Company Profile <ExternalLink size={12} />
                  </a>
                </div>

                {companyProfile?.description && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{companyProfile.description}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
                  {companyProfile?.industryType && (
                    <div className="flex items-start gap-2"><Building2 size={14} className="mt-0.5 text-primary shrink-0" />
                      <div><p className="text-gray-400 text-xs">Industry</p><p className="font-medium text-gray-700">{companyProfile.industryType}</p></div>
                    </div>
                  )}
                  {companyProfile?.companySize && (
                    <div className="flex items-start gap-2"><Users size={14} className="mt-0.5 text-primary shrink-0" />
                      <div><p className="text-gray-400 text-xs">Company Size</p><p className="font-medium text-gray-700">{companyProfile.companySize}</p></div>
                    </div>
                  )}
                  {companyProfile?.establishedDate && (
                    <div className="flex items-start gap-2"><Calendar size={14} className="mt-0.5 text-primary shrink-0" />
                      <div><p className="text-gray-400 text-xs">Founded</p><p className="font-medium text-gray-700">{new Date(companyProfile.establishedDate).getFullYear()}</p></div>
                    </div>
                  )}
                  {companyProfile?.address && (
                    <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 text-primary shrink-0" />
                      <div><p className="text-gray-400 text-xs">Headquarters</p><p className="font-medium text-gray-700">{companyProfile.address}</p></div>
                    </div>
                  )}
                  {companyProfile?.website && (
                    <div className="flex items-start gap-2"><Globe size={14} className="mt-0.5 text-primary shrink-0" />
                      <div><p className="text-gray-400 text-xs">Website</p><p className="font-medium text-gray-700 truncate max-w-[10rem]">{companyProfile.website}</p></div>
                    </div>
                  )}
                  {companyProfile?.socialLinks?.linkedin && (
                    <div className="flex items-start gap-2"><Linkedin size={14} className="mt-0.5 text-primary shrink-0" />
                      <div><p className="text-gray-400 text-xs">LinkedIn</p><p className="font-medium text-gray-700 truncate max-w-[10rem]">{companyProfile.socialLinks.linkedin}</p></div>
                    </div>
                  )}
                </div>

                {companyProfile?.mission && (
                  <div className="mb-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"><Target size={12} className="text-primary" /> Mission</p>
                    <p className="text-sm text-gray-600">{companyProfile.mission}</p>
                  </div>
                )}
                {companyProfile?.culture && (
                  <div className="mb-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1"><Heart size={12} className="text-primary" /> Culture</p>
                    <p className="text-sm text-gray-600">{companyProfile.culture}</p>
                  </div>
                )}
                {companyProfile?.companyLocations?.length > 0 && (
                  <div className="mb-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5"><MapPin size={12} className="text-primary" /> Office Locations</p>
                    <div className="flex flex-wrap gap-2">
                      {companyProfile.companyLocations.map((loc: string) => (
                        <span key={loc} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{loc}</span>
                      ))}
                    </div>
                  </div>
                )}
                {companyProfile?.companyBenefits?.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5"><Gift size={12} className="text-primary" /> Benefits</p>
                    <div className="flex flex-wrap gap-2">
                      {companyProfile.companyBenefits.map((b: string) => (
                        <span key={b} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                {!companyProfile?.description && !companyProfile?.industryType && !companyProfile?.mission && !companyProfile?.culture && (
                  <p className="text-sm text-gray-400">
                    Your Company Profile is mostly empty. Fill it in from your dashboard so jobseekers see more than just your name on this job.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Compensation */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Salary *</label>
                <input name="salary" placeholder="e.g. $1000, negotiable" value={formData.salary} onChange={handleChange} className={inputCls} />
                <p className="mt-1 text-xs text-gray-500">Or fill in the structured range below — it fills this in for you automatically.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block mb-1 text-sm text-gray-600">Salary Min</label>
                  <input name="salaryMin" type="number" min={0} value={formData.salaryMin} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-600">Salary Max</label>
                  <input name="salaryMax" type="number" min={0} value={formData.salaryMax} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-600">Currency</label>
                  <input name="currency" value={formData.currency} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-600">Period</label>
                  <select name="salaryPeriod" value={formData.salaryPeriod} onChange={handleChange} className={inputCls}>
                    <option value="Yearly">Yearly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block mb-1 text-sm text-gray-600">Experience (free text)</label>
                  <input name="experience" placeholder="e.g. 2+ years" value={formData.experience} onChange={handleChange} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm text-gray-600">Min Exp. (yrs)</label>
                    <input name="minExperience" type="number" min={0} value={formData.minExperience} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm text-gray-600">Max Exp. (yrs)</label>
                    <input name="maxExperience" type="number" min={0} value={formData.maxExperience} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Benefits</label>
                  <input name="benefits" value={formData.benefits} onChange={handleChange} placeholder="Comma-separated, e.g. Health insurance, Paid time off" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Perks</label>
                  <input name="perks" value={formData.perks} onChange={handleChange} placeholder="Comma-separated, e.g. Free lunch, Gym membership" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Preview */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Review everything below before publishing — you can still go back and edit any step.</p>
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-xl font-bold text-gray-800">{formData.title || "Untitled job"}</h3>
                <p className="text-gray-600">{displayCompanyName || "Your company"}{displayCompanyTagline ? ` — ${displayCompanyTagline}` : ""}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span>{formData.location || "—"}{formData.country ? `, ${formData.country}` : ""}</span>
                  <span>{formData.workMode}</span>
                  <span>{formData.jobtype || "—"}</span>
                  <span>{formData.level || "—"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                  <div><p className="text-gray-400 text-xs">Salary</p><p className="font-medium">{formData.salary || "—"}</p></div>
                  <div><p className="text-gray-400 text-xs">Experience</p><p className="font-medium">{formData.experience || "—"}</p></div>
                  <div><p className="text-gray-400 text-xs">Openings</p><p className="font-medium">{formData.openings}</p></div>
                  <div><p className="text-gray-400 text-xs">Deadline</p><p className="font-medium">{formData.deadline || "—"}</p></div>
                </div>
                {formData.overview && <p className="mt-4 text-sm text-gray-600">{formData.overview}</p>}
                {formData.requiredSkills && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {toArray(formData.requiredSkills).map((s) => (
                      <span key={s} className="rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">{s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 text-sm text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: formData.description || "<p class='text-gray-400'>No description yet.</p>" }} />
              </div>
            </div>
          )}

          {/* Step 6: Publish */}
          {step === 5 && (
            <div className="space-y-5 text-center py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check size={28} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Ready to publish?</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Publishing submits this job for admin review — same as every job on QuickJobs — and it goes live once approved.
                  You can also save it as a draft and come back later.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button type="button" onClick={handleSaveDraft} disabled={mutation.isPending} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  {mutation.isPending ? "Saving..." : "Save as Draft"}
                </button>
                <button type="button" onClick={handlePublish} disabled={mutation.isPending} className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {mutation.isPending ? "Publishing..." : isEdit && sourceStatus !== "Draft" ? "Save Changes" : "Publish Job"}
                </button>
              </div>
            </div>
          )}

          {/* Step navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => (step === 0 ? navigate("/employer/dashboard") : goBack())}
              className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft size={16} /> {step === 0 ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              {step < STEPS.length - 1 && (
                <button type="button" onClick={handleSaveDraft} disabled={mutation.isPending} className="px-4 py-2 text-sm text-gray-500 hover:text-primary">
                  Save as Draft
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button type="button" onClick={goNext} className="flex items-center gap-1 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                  {step === STEPS.length - 2 ? "Review to Publish" : "Next"} <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJob;
