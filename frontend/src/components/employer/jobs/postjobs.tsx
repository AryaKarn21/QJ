import React, { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { createJob, getSingleJob, editJob, getEmployerProfile, fetchCountries, fetchCurrencies } from "../employerApi/api";
import { CurrencySelect } from "../../common/CurrencySelect";
import { CustomSelect } from "../../common/CustomSelect";
import { formatSalaryRange } from "../../../utils/currency";
import { fetchJobCategories } from "../../../api/jobCategoryApi";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import ReactQuill from "react-quill";
import { SkeletonText, SkeletonBlock } from "../../ui/Skeleton";
import "react-quill/dist/quill.snow.css";
import { TagInput } from "../../common/TagInput";
import {
  CalendarClock, Check, ChevronLeft, ChevronRight, Building2, Pencil,
  Globe, Linkedin, Target, Heart, MapPin, Gift, Users, Calendar, ExternalLink,
} from "lucide-react";


// LinkedIn/Naukri-style posting flow (section 12): Job Details ->
// Requirements -> Company -> Compensation -> Preview -> Publish. Every
// field below already existed as a flat form (Phase 1) — this is a
// reorganization into steps, not a new set of fields or a new API.
const STEPS = ["Job Details", "Requirements", "Company", "Compensation", "Preview", "Publish"];

export const POPULAR_JOB_TITLES: { value: string; label: string; group?: string }[] = [
  // Engineering & Tech
  { value: "Software Engineer", label: "Software Engineer", group: "Engineering & Tech" },
  { value: "Frontend Developer", label: "Frontend Developer", group: "Engineering & Tech" },
  { value: "Backend Developer", label: "Backend Developer", group: "Engineering & Tech" },
  { value: "Full Stack Developer", label: "Full Stack Developer", group: "Engineering & Tech" },
  { value: "Mobile App Developer", label: "Mobile App Developer", group: "Engineering & Tech" },
  { value: "DevOps Engineer", label: "DevOps Engineer", group: "Engineering & Tech" },
  { value: "Cloud Architect", label: "Cloud Architect", group: "Engineering & Tech" },
  { value: "QA Engineer", label: "QA Engineer", group: "Engineering & Tech" },
  { value: "Systems Engineer", label: "Systems Engineer", group: "Engineering & Tech" },
  // Data & AI
  { value: "Data Analyst", label: "Data Analyst", group: "Data & AI" },
  { value: "Data Scientist", label: "Data Scientist", group: "Data & AI" },
  { value: "Data Engineer", label: "Data Engineer", group: "Data & AI" },
  { value: "AI / Machine Learning Engineer", label: "AI / Machine Learning Engineer", group: "Data & AI" },
  // Product & Design
  { value: "UI/UX Designer", label: "UI/UX Designer", group: "Product & Design" },
  { value: "Product Designer", label: "Product Designer", group: "Product & Design" },
  { value: "Product Manager", label: "Product Manager", group: "Product & Design" },
  { value: "Project Manager", label: "Project Manager", group: "Product & Design" },
  { value: "Graphic Designer", label: "Graphic Designer", group: "Product & Design" },
  // Marketing & Sales
  { value: "Digital Marketer", label: "Digital Marketer", group: "Marketing & Sales" },
  { value: "Content Writer", label: "Content Writer", group: "Marketing & Sales" },
  { value: "SEO Specialist", label: "SEO Specialist", group: "Marketing & Sales" },
  { value: "Social Media Manager", label: "Social Media Manager", group: "Marketing & Sales" },
  { value: "Sales Executive", label: "Sales Executive", group: "Marketing & Sales" },
  { value: "Business Development Manager", label: "Business Development Manager", group: "Marketing & Sales" },
  // Business & Support
  { value: "HR Executive", label: "HR Executive", group: "Business & Support" },
  { value: "Customer Support", label: "Customer Support", group: "Business & Support" },
  { value: "Accountant", label: "Accountant", group: "Business & Support" },
  { value: "Business Analyst", label: "Business Analyst", group: "Business & Support" },
  { value: "Operations Manager", label: "Operations Manager", group: "Business & Support" },
  // Other
  { value: "Other", label: "Other" },
];

export const DEPARTMENT_OPTIONS = [
  { value: "Engineering & Technology", label: "Engineering & Technology" },
  { value: "Product Management", label: "Product Management" },
  { value: "Design & Creative", label: "Design & Creative" },
  { value: "Marketing & Communications", label: "Marketing & Communications" },
  { value: "Sales & Business Development", label: "Sales & Business Development" },
  { value: "Customer Success & Support", label: "Customer Success & Support" },
  { value: "Human Resources & Talent", label: "Human Resources & Talent" },
  { value: "Finance & Accounting", label: "Finance & Accounting" },
  { value: "Operations & Administration", label: "Operations & Administration" },
  { value: "Legal & Compliance", label: "Legal & Compliance" },
  { value: "Data & Analytics", label: "Data & Analytics" },
  { value: "Healthcare & Medical", label: "Healthcare & Medical" },
  { value: "Education & Training", label: "Education & Training" },
  { value: "Other", label: "Other" },
];

export const JOB_LEVEL_OPTIONS = [
  { value: "Internship", label: "Internship" },
  { value: "Fresher", label: "Fresher" },
  { value: "Entry Level", label: "Entry Level" },
  { value: "Junior", label: "Junior" },
  { value: "Associate", label: "Associate" },
  { value: "Mid Level", label: "Mid Level" },
  { value: "Senior", label: "Senior" },
  { value: "Lead", label: "Lead" },
  { value: "Manager", label: "Manager" },
  { value: "Director", label: "Director" },
  { value: "Executive", label: "Executive" },
  { value: "Other", label: "Other" },
];

export const JOB_TYPE_OPTIONS = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Internship", label: "Internship" },
  { value: "Freelance", label: "Freelance" },
  { value: "Temporary", label: "Temporary" },
  { value: "Volunteer", label: "Volunteer" },
  { value: "Other", label: "Other" },
];

export const WORK_MODE_OPTIONS = [
  { value: "On-site", label: "On-site" },
  { value: "Remote", label: "Remote" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Other", label: "Other" },
];

export const POPULAR_LOCATIONS: { value: string; label: string; group?: string }[] = [
  // Nepal
  { value: "Kathmandu, Nepal", label: "Kathmandu, Nepal", group: "Nepal" },
  { value: "Lalitpur, Nepal", label: "Lalitpur, Nepal", group: "Nepal" },
  { value: "Bhaktapur, Nepal", label: "Bhaktapur, Nepal", group: "Nepal" },
  { value: "Pokhara, Nepal", label: "Pokhara, Nepal", group: "Nepal" },
  { value: "Biratnagar, Nepal", label: "Biratnagar, Nepal", group: "Nepal" },
  { value: "Butwal, Nepal", label: "Butwal, Nepal", group: "Nepal" },
  { value: "Chitwan, Nepal", label: "Chitwan, Nepal", group: "Nepal" },
  { value: "Birgunj, Nepal", label: "Birgunj, Nepal", group: "Nepal" },
  { value: "Dharan, Nepal", label: "Dharan, Nepal", group: "Nepal" },
  // India
  { value: "New Delhi, India", label: "New Delhi, India", group: "India" },
  { value: "Bengaluru, India", label: "Bengaluru, India", group: "India" },
  { value: "Mumbai, India", label: "Mumbai, India", group: "India" },
  { value: "Hyderabad, India", label: "Hyderabad, India", group: "India" },
  { value: "Pune, India", label: "Pune, India", group: "India" },
  { value: "Kolkata, India", label: "Kolkata, India", group: "India" },
  // International
  { value: "Dubai, UAE", label: "Dubai, UAE", group: "International" },
  { value: "London, UK", label: "London, UK", group: "International" },
  { value: "New York, USA", label: "New York, USA", group: "International" },
  { value: "Toronto, Canada", label: "Toronto, Canada", group: "International" },
  { value: "Sydney, Australia", label: "Sydney, Australia", group: "International" },
  // Remote
  { value: "Remote / Anywhere", label: "Remote / Anywhere", group: "Remote" },
  { value: "Other", label: "Other" },
];

export const JOINING_DATE_OPTIONS = [
  { value: "Immediate (Within 7 days)", label: "Immediate (Within 7 days)" },
  { value: "Within 15 Days", label: "Within 15 Days" },
  { value: "Within 30 Days", label: "Within 30 Days" },
  { value: "Within 45 Days", label: "Within 45 Days" },
  { value: "Within 60 Days", label: "Within 60 Days" },
  { value: "Specific Date", label: "Specific Date (Choose calendar date)" },
  { value: "Flexible / Negotiable", label: "Flexible / Negotiable" },
  { value: "Other", label: "Other" },
];

export const HIRING_PROCESS_OPTIONS = [
  { value: "Resume Screening → HR Round → Offer", label: "Resume Screening → HR Round → Offer" },
  { value: "Resume Screening → Technical Interview → HR Round → Offer", label: "Resume Screening → Technical Interview → HR Round → Offer" },
  { value: "Resume Screening → Skill Assessment → Technical Interview → HR Round → Offer", label: "Resume Screening → Skill Assessment → Technical Interview → HR Round → Offer" },
  { value: "Resume Screening → Assignment → Panel Interview → Offer", label: "Resume Screening → Assignment → Panel Interview → Offer" },
  { value: "Single Round Interview → Direct Hiring", label: "Single Round Interview → Direct Hiring" },
  { value: "Walk-in Interview / Immediate Evaluation", label: "Walk-in Interview / Immediate Evaluation" },
  { value: "Other", label: "Other" },
];

const EMPTY_FORM = {
  title: "",
  country: "Nepal",
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
  joiningDate: "",
  hiringProcess: "",
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

const inputCls = "w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none transition-all duration-200 hover:border-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20";
const inputErrorCls = "w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-red-500 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-red-200";
const labelCls = "block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200";

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

  // Selection and custom 'Other' states for Step 1
  const [titleSelect, setTitleSelect] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  const [categorySelect, setCategorySelect] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  const [departmentSelect, setDepartmentSelect] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");

  const [levelSelect, setLevelSelect] = useState("");
  const [customLevel, setCustomLevel] = useState("");

  const [jobtypeSelect, setJobtypeSelect] = useState("");
  const [customJobType, setCustomJobType] = useState("");

  const [workModeSelect, setWorkModeSelect] = useState("On-site");
  const [customWorkMode, setCustomWorkMode] = useState("");

  const [countrySelect, setCountrySelect] = useState("Nepal");
  const [customCountry, setCustomCountry] = useState("");

  const [locationSelect, setLocationSelect] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  const [joiningDateSelect, setJoiningDateSelect] = useState("");
  const [customJoiningDate, setCustomJoiningDate] = useState("");
  const [specificJoiningDate, setSpecificJoiningDate] = useState("");

  const [hiringProcessSelect, setHiringProcessSelect] = useState("");
  const [customHiringProcess, setCustomHiringProcess] = useState("");

  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  const { data: jobData, isLoading: isFetching } = useQuery({
    queryKey: ["job", jobId || duplicateFrom],
    queryFn: () => getSingleJob((jobId || duplicateFrom) as string),
    enabled: !!(jobId || duplicateFrom),
  });

  // Real, admin-managed categories
  const { data: categories = [] } = useQuery({
    queryKey: ["jobCategories"],
    queryFn: fetchJobCategories,
  });

  const categoryOptions = useMemo(() => {
    const opts = categories.map((c) => ({ value: c.name, label: c.name }));
    opts.push({ value: "Other", label: "Other" });
    return opts;
  }, [categories]);

  // Public countries list
  const { data: rawCountries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
  });

  const countryOptions = useMemo(() => {
    const list = rawCountries.length > 0 ? rawCountries : [
      "Nepal", "India", "United States", "United Kingdom", "Canada", "Australia",
      "Germany", "United Arab Emirates", "Singapore", "Japan", "Malaysia", "Bangladesh", "Pakistan", "Sri Lanka"
    ];
    const opts = list.map((c: string) => ({ value: c, label: c }));
    opts.push({ value: "Other", label: "Other" });
    return opts;
  }, [rawCountries]);

  const { data: currencyData } = useQuery({
    queryKey: ["currencies"],
    queryFn: fetchCurrencies,
    staleTime: Infinity,
  });
  const currencies = currencyData?.currencies ?? [];

  const [currencyTouched, setCurrencyTouched] = useState(false);

  const { data: companyProfile } = useQuery({
    queryKey: ["employerProfile"],
    queryFn: getEmployerProfile,
  });

  useEffect(() => {
    if (!jobData) return;
    setSourceStatus(jobData.status);
    if (jobData.currency) setCurrencyTouched(true);

    // Sync Title
    if (jobData.title) {
      const isKnown = POPULAR_JOB_TITLES.some((t) => t.value === jobData.title && t.value !== "Other");
      if (isKnown) {
        setTitleSelect(jobData.title);
        setCustomTitle("");
      } else {
        setTitleSelect("Other");
        setCustomTitle(jobData.title);
      }
    }

    // Sync Category
    if (jobData.jobcategory) {
      const isKnown = categories.some((c) => c.name === jobData.jobcategory);
      if (isKnown) {
        setCategorySelect(jobData.jobcategory);
        setCustomCategory("");
      } else {
        setCategorySelect("Other");
        setCustomCategory(jobData.jobcategory);
      }
    }

    // Sync Department
    if (jobData.department) {
      const isKnown = DEPARTMENT_OPTIONS.some((d) => d.value === jobData.department && d.value !== "Other");
      if (isKnown) {
        setDepartmentSelect(jobData.department);
        setCustomDepartment("");
      } else {
        setDepartmentSelect("Other");
        setCustomDepartment(jobData.department);
      }
    }

    // Sync Level
    if (jobData.level) {
      const isKnown = JOB_LEVEL_OPTIONS.some((l) => l.value === jobData.level && l.value !== "Other");
      if (isKnown) {
        setLevelSelect(jobData.level);
        setCustomLevel("");
      } else {
        setLevelSelect("Other");
        setCustomLevel(jobData.level);
      }
    }

    // Sync Job Type
    if (jobData.jobtype) {
      const isKnown = JOB_TYPE_OPTIONS.some((t) => t.value === jobData.jobtype && t.value !== "Other");
      if (isKnown) {
        setJobtypeSelect(jobData.jobtype);
        setCustomJobType("");
      } else {
        setJobtypeSelect("Other");
        setCustomJobType(jobData.jobtype);
      }
    }

    // Sync Work Mode
    if (jobData.workMode) {
      const isKnown = WORK_MODE_OPTIONS.some((m) => m.value === jobData.workMode && m.value !== "Other");
      if (isKnown) {
        setWorkModeSelect(jobData.workMode);
        setCustomWorkMode("");
      } else {
        setWorkModeSelect("Other");
        setCustomWorkMode(jobData.workMode);
      }
    }

    // Sync Country
    if (jobData.country) {
      const isKnown = countryOptions.some((c) => c.value === jobData.country && c.value !== "Other");
      if (isKnown) {
        setCountrySelect(jobData.country);
        setCustomCountry("");
      } else {
        setCountrySelect("Other");
        setCustomCountry(jobData.country);
      }
    }

    // Sync Location
    if (jobData.location) {
      const isKnown = POPULAR_LOCATIONS.some((l) => l.value === jobData.location && l.value !== "Other");
      if (isKnown) {
        setLocationSelect(jobData.location);
        setCustomLocation("");
      } else {
        setLocationSelect("Other");
        setCustomLocation(jobData.location);
      }
    }

    // Sync Joining Date
    if (jobData.joiningDate) {
      const isKnown = JOINING_DATE_OPTIONS.some((j) => j.value === jobData.joiningDate && j.value !== "Other" && j.value !== "Specific Date");
      if (isKnown) {
        setJoiningDateSelect(jobData.joiningDate);
        setCustomJoiningDate("");
        setSpecificJoiningDate("");
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(jobData.joiningDate)) {
        setJoiningDateSelect("Specific Date");
        setSpecificJoiningDate(jobData.joiningDate);
        setCustomJoiningDate("");
      } else {
        setJoiningDateSelect("Other");
        setCustomJoiningDate(jobData.joiningDate);
        setSpecificJoiningDate("");
      }
    }

    // Sync Hiring Process
    if (jobData.hiringProcess) {
      const isKnown = HIRING_PROCESS_OPTIONS.some((h) => h.value === jobData.hiringProcess && h.value !== "Other");
      if (isKnown) {
        setHiringProcessSelect(jobData.hiringProcess);
        setCustomHiringProcess("");
      } else {
        setHiringProcessSelect("Other");
        setCustomHiringProcess(jobData.hiringProcess);
      }
    }

    setFormData((prev) => ({
      ...prev,
      ...jobData,
      country: jobData.country || "Nepal",
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
  }, [jobData, categories, countryOptions]);

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
    delete payload.status;

    // Clean up empty optional fields
    if (!payload.department) delete payload.department;
    if (!payload.joiningDate) delete payload.joiningDate;
    if (!payload.hiringProcess) delete payload.hiringProcess;

    if (isDraft) {
      payload.status = "Draft";
    } else if (isEdit && sourceStatus === "Draft") {
      payload.status = "Pending";
    }
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

  const handleTitleSelect = (val: string) => {
    setTitleSelect(val);
    if (val === "Other") {
      setCustomTitle("");
      setFormData((prev) => ({ ...prev, title: "" }));
    } else {
      setCustomTitle("");
      setFormData((prev) => ({ ...prev, title: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.title;
      return n;
    });
  };

  const handleCustomTitleChange = (val: string) => {
    setCustomTitle(val);
    setFormData((prev) => ({ ...prev, title: val }));
    if (step1Errors.title) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.title;
        return n;
      });
    }
  };

  const handleCategorySelect = (val: string) => {
    setCategorySelect(val);
    if (val === "Other") {
      setCustomCategory("");
      setFormData((prev) => ({ ...prev, jobcategory: "" }));
    } else {
      setCustomCategory("");
      setFormData((prev) => ({ ...prev, jobcategory: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.jobcategory;
      return n;
    });
  };

  const handleCustomCategoryChange = (val: string) => {
    setCustomCategory(val);
    setFormData((prev) => ({ ...prev, jobcategory: val }));
    if (step1Errors.jobcategory) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.jobcategory;
        return n;
      });
    }
  };

  // Department handlers
  const handleDepartmentSelect = (val: string) => {
    setDepartmentSelect(val);
    if (val === "Other") {
      setCustomDepartment("");
      setFormData((prev) => ({ ...prev, department: "" }));
    } else {
      setCustomDepartment("");
      setFormData((prev) => ({ ...prev, department: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.department;
      return n;
    });
  };

  const handleCustomDepartmentChange = (val: string) => {
    setCustomDepartment(val);
    setFormData((prev) => ({ ...prev, department: val }));
    if (step1Errors.department) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.department;
        return n;
      });
    }
  };

  const handleLevelSelect = (val: string) => {
    setLevelSelect(val);
    if (val === "Other") {
      setCustomLevel("");
      setFormData((prev) => ({ ...prev, level: "" }));
    } else {
      setCustomLevel("");
      setFormData((prev) => ({ ...prev, level: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.level;
      return n;
    });
  };

  const handleCustomLevelChange = (val: string) => {
    setCustomLevel(val);
    setFormData((prev) => ({ ...prev, level: val }));
    if (step1Errors.level) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.level;
        return n;
      });
    }
  };

  const handleJobTypeSelect = (val: string) => {
    setJobtypeSelect(val);
    if (val === "Other") {
      setCustomJobType("");
      setFormData((prev) => ({ ...prev, jobtype: "" }));
    } else {
      setCustomJobType("");
      setFormData((prev) => ({ ...prev, jobtype: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.jobtype;
      return n;
    });
  };

  const handleCustomJobTypeChange = (val: string) => {
    setCustomJobType(val);
    setFormData((prev) => ({ ...prev, jobtype: val }));
    if (step1Errors.jobtype) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.jobtype;
        return n;
      });
    }
  };

  const handleWorkModeSelect = (val: string) => {
    setWorkModeSelect(val);
    if (val === "Other") {
      setCustomWorkMode("");
      setFormData((prev) => ({ ...prev, workMode: "" }));
    } else {
      setCustomWorkMode("");
      setFormData((prev) => ({ ...prev, workMode: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.workMode;
      return n;
    });
  };

  const handleCustomWorkModeChange = (val: string) => {
    setCustomWorkMode(val);
    setFormData((prev) => ({ ...prev, workMode: val }));
    if (step1Errors.workMode) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.workMode;
        return n;
      });
    }
  };

  // Country handlers
  const handleCountrySelect = (val: string) => {
    setCountrySelect(val);
    if (val === "Other") {
      setCustomCountry("");
      setFormData((prev) => ({ ...prev, country: "" }));
    } else {
      setCustomCountry("");
      setFormData((prev) => ({ ...prev, country: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.country;
      return n;
    });
  };

  const handleCustomCountryChange = (val: string) => {
    setCustomCountry(val);
    setFormData((prev) => ({ ...prev, country: val }));
    if (step1Errors.country) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.country;
        return n;
      });
    }
  };

  // Location handlers
  const handleLocationSelect = (val: string) => {
    setLocationSelect(val);
    if (val === "Other") {
      setCustomLocation("");
      setFormData((prev) => ({ ...prev, location: "" }));
    } else {
      setCustomLocation("");
      setFormData((prev) => ({ ...prev, location: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.location;
      return n;
    });
  };

  const handleCustomLocationChange = (val: string) => {
    setCustomLocation(val);
    setFormData((prev) => ({ ...prev, location: val }));
    if (step1Errors.location) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.location;
        return n;
      });
    }
  };

  // Joining Date handlers
  const handleJoiningDateSelect = (val: string) => {
    setJoiningDateSelect(val);
    if (val === "Specific Date") {
      setCustomJoiningDate("");
      setFormData((prev) => ({ ...prev, joiningDate: specificJoiningDate }));
    } else if (val === "Other") {
      setSpecificJoiningDate("");
      setFormData((prev) => ({ ...prev, joiningDate: customJoiningDate }));
    } else {
      setCustomJoiningDate("");
      setSpecificJoiningDate("");
      setFormData((prev) => ({ ...prev, joiningDate: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.joiningDate;
      return n;
    });
  };

  const handleSpecificJoiningDateChange = (val: string) => {
    setSpecificJoiningDate(val);
    setFormData((prev) => ({ ...prev, joiningDate: val }));
    if (step1Errors.joiningDate) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.joiningDate;
        return n;
      });
    }
  };

  const handleCustomJoiningDateChange = (val: string) => {
    setCustomJoiningDate(val);
    setFormData((prev) => ({ ...prev, joiningDate: val }));
    if (step1Errors.joiningDate) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.joiningDate;
        return n;
      });
    }
  };

  // Hiring Process handlers
  const handleHiringProcessSelect = (val: string) => {
    setHiringProcessSelect(val);
    if (val === "Other") {
      setCustomHiringProcess("");
      setFormData((prev) => ({ ...prev, hiringProcess: "" }));
    } else {
      setCustomHiringProcess("");
      setFormData((prev) => ({ ...prev, hiringProcess: val }));
    }
    setStep1Errors((prev) => {
      const n = { ...prev };
      delete n.hiringProcess;
      return n;
    });
  };

  const handleCustomHiringProcessChange = (val: string) => {
    setCustomHiringProcess(val);
    setFormData((prev) => ({ ...prev, hiringProcess: val }));
    if (step1Errors.hiringProcess) {
      setStep1Errors((prev) => {
        const n = { ...prev };
        delete n.hiringProcess;
        return n;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Job Title
    if (titleSelect === "Other") {
      if (!customTitle.trim()) {
        errs.title = "Please enter your custom job title.";
      }
    } else if (!formData.title.trim()) {
      errs.title = "Job title is required.";
    }

    // 2. Job Category
    if (categorySelect === "Other") {
      if (!customCategory.trim()) {
        errs.jobcategory = "Please enter your custom category.";
      }
    } else if (!formData.jobcategory.trim()) {
      errs.jobcategory = "Job category is required.";
    }

    // 3. Department (if other selected)
    if (departmentSelect === "Other" && !customDepartment.trim()) {
      errs.department = "Please enter your custom department.";
    }

    // 4. Job Level
    if (levelSelect === "Other") {
      if (!customLevel.trim()) {
        errs.level = "Please enter your custom job level.";
      }
    } else if (!formData.level.trim()) {
      errs.level = "Job level is required.";
    }

    // 5. Job Type
    if (jobtypeSelect === "Other") {
      if (!customJobType.trim()) {
        errs.jobtype = "Please enter your custom job type.";
      }
    } else if (!formData.jobtype.trim()) {
      errs.jobtype = "Job type is required.";
    }

    // 6. Work Mode
    if (workModeSelect === "Other") {
      if (!customWorkMode.trim()) {
        errs.workMode = "Please enter your custom work mode.";
      }
    } else if (!formData.workMode.trim()) {
      errs.workMode = "Work mode is required.";
    }

    // 7. Country
    if (countrySelect === "Other") {
      if (!customCountry.trim()) {
        errs.country = "Please enter your country.";
      }
    } else if (!formData.country.trim()) {
      errs.country = "Country is required.";
    }

    // 8. Preferred Location
    if (locationSelect === "Other") {
      if (!customLocation.trim()) {
        errs.location = "Please enter your preferred location.";
      }
    } else if (!formData.location.trim()) {
      errs.location = "Preferred location is required.";
    }

    // 9. Joining Date (if specific date or other selected)
    if (joiningDateSelect === "Specific Date" && !specificJoiningDate) {
      errs.joiningDate = "Please choose a specific target joining date.";
    } else if (joiningDateSelect === "Other" && !customJoiningDate.trim()) {
      errs.joiningDate = "Please enter joining timeframe details.";
    }

    // 10. Hiring Process (if other selected)
    if (hiringProcessSelect === "Other" && !customHiringProcess.trim()) {
      errs.hiringProcess = "Please specify your hiring process.";
    }

    // 11. Application Deadline
    if (!formData.deadline) {
      errs.deadline = "Application deadline is required.";
    } else if (formData.deadline < todayStr) {
      errs.deadline = "Application deadline must be today or a future date.";
    }

    // 12. Openings
    if (Number(formData.openings) < 1) {
      errs.openings = "Openings must be at least 1.";
    }

    setStep1Errors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fill in all required fields before proceeding.");
      return false;
    }
    return true;
  };

  const REQUIRED_FOR_PUBLISH: { field: keyof typeof EMPTY_FORM; label: string; step: number }[] = [
    { field: "title", label: "Job title", step: 0 },
    { field: "country", label: "Country", step: 0 },
    { field: "location", label: "Preferred location", step: 0 },
    { field: "jobtype", label: "Job type", step: 0 },
    { field: "jobcategory", label: "Job category", step: 0 },
    { field: "level", label: "Job level", step: 0 },
    { field: "workMode", label: "Work mode", step: 0 },
    { field: "deadline", label: "Application deadline", step: 0 },
    { field: "description", label: "Job description", step: 1 },
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
    if (!formData.salary.trim() && !formData.salaryMin && !formData.salaryMax) {
      toast.error("Salary is required before publishing.");
      setStep(3);
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

  const goNext = () => {
    if (step === 0) {
      if (!validateStep1()) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleStepClick = (targetStep: number) => {
    if (step === 0 && targetStep > 0) {
      if (!validateStep1()) return;
    }
    setStep(targetStep);
  };

  if ((isEdit || duplicateFrom) && isFetching) return (
    <div className="max-w-3xl mx-auto p-6 space-y-5" aria-busy="true" aria-label="Loading job data">
      <SkeletonText width="w-1/2" height="h-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonText height="h-10" />
        <SkeletonText height="h-10" />
      </div>
      <SkeletonBlock className="h-40 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonText height="h-10" />
        <SkeletonText height="h-10" />
      </div>
    </div>
  );

  const displayCompanyName = formData.useCompanyOverride && formData.overrideName ? formData.overrideName : companyProfile?.name;
  const displayCompanyTagline = formData.useCompanyOverride && formData.overrideTagline ? formData.overrideTagline : companyProfile?.headline;

  const previewSalary = formData.salary
    || (formData.salaryMin || formData.salaryMax
      ? formatSalaryRange(toNumberOrUndefined(formData.salaryMin), toNumberOrUndefined(formData.salaryMax), formData.currency, formData.salaryPeriod)
      : "");

  return (
    <div className="min-h-screen overflow-auto bg-gray-50 py-8" style={{ maxHeight: "calc(100dvh - 50px)" }}>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-1 text-gray-900">
          {isEdit ? "Edit Job" : duplicateFrom ? "Duplicate Job" : "Post a Job"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {sourceStatus === "Draft" && isEdit ? "Continuing a saved draft — " : ""}
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        {/* Step indicator */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2 scrollbar-none">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                type="button"
                onClick={() => handleStepClick(i)}
                className="flex items-center gap-2 shrink-0 group focus:outline-none"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                    i < step
                      ? "bg-primary text-white shadow-sm"
                      : i === step
                      ? "bg-primary/10 border-2 border-primary text-primary font-bold"
                      : "border border-gray-300 text-gray-400 group-hover:border-gray-400"
                  }`}
                >
                  {i < step ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={`text-xs whitespace-nowrap transition-colors ${
                    i === step
                      ? "font-bold text-gray-900"
                      : i < step
                      ? "font-medium text-gray-700"
                      : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 min-w-5 mx-2 transition-colors ${
                    i < step ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Step 1: Job Details */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Row 1, Col 1: Job Title * */}
              <div>
                <CustomSelect
                  id="job-title-select"
                  label="Job Title"
                  required
                  searchable
                  searchPlaceholder="Search job title..."
                  placeholder="Select Job Title"
                  value={titleSelect}
                  options={POPULAR_JOB_TITLES}
                  onChange={handleTitleSelect}
                  error={step1Errors.title && titleSelect !== "Other" ? step1Errors.title : undefined}
                />
                {titleSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your job title"
                      value={customTitle}
                      onChange={(e) => handleCustomTitleChange(e.target.value)}
                      className={step1Errors.title ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.title && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.title}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 1, Col 2: Job Category * */}
              <div>
                <CustomSelect
                  id="job-category-select"
                  label="Job Category"
                  required
                  searchable
                  searchPlaceholder="Search category..."
                  placeholder="Select Category"
                  value={categorySelect}
                  options={categoryOptions}
                  onChange={handleCategorySelect}
                  error={step1Errors.jobcategory && categorySelect !== "Other" ? step1Errors.jobcategory : undefined}
                />
                {categorySelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Job Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter category"
                      value={customCategory}
                      onChange={(e) => handleCustomCategoryChange(e.target.value)}
                      className={step1Errors.jobcategory ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.jobcategory && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.jobcategory}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2, Col 1: Department */}
              <div>
                <CustomSelect
                  id="job-department-select"
                  label="Department"
                  searchable
                  searchPlaceholder="Search department..."
                  placeholder="Select Department (Optional)"
                  value={departmentSelect}
                  options={DEPARTMENT_OPTIONS}
                  onChange={handleDepartmentSelect}
                  error={step1Errors.department && departmentSelect !== "Other" ? step1Errors.department : undefined}
                />
                {departmentSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter department name"
                      value={customDepartment}
                      onChange={(e) => handleCustomDepartmentChange(e.target.value)}
                      className={step1Errors.department ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.department && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.department}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2, Col 2: Job Level * */}
              <div>
                <CustomSelect
                  id="job-level-select"
                  label="Job Level"
                  required
                  placeholder="Select Level"
                  value={levelSelect}
                  options={JOB_LEVEL_OPTIONS}
                  onChange={handleLevelSelect}
                  error={step1Errors.level && levelSelect !== "Other" ? step1Errors.level : undefined}
                />
                {levelSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Job Level <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter job level"
                      value={customLevel}
                      onChange={(e) => handleCustomLevelChange(e.target.value)}
                      className={step1Errors.level ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.level && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.level}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3, Col 1: Job Type * */}
              <div>
                <CustomSelect
                  id="job-type-select"
                  label="Job Type"
                  required
                  placeholder="Select Job Type"
                  value={jobtypeSelect}
                  options={JOB_TYPE_OPTIONS}
                  onChange={handleJobTypeSelect}
                  error={step1Errors.jobtype && jobtypeSelect !== "Other" ? step1Errors.jobtype : undefined}
                />
                {jobtypeSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Job Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter job type"
                      value={customJobType}
                      onChange={(e) => handleCustomJobTypeChange(e.target.value)}
                      className={step1Errors.jobtype ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.jobtype && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.jobtype}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 3, Col 2: Work Mode * */}
              <div>
                <CustomSelect
                  id="work-mode-select"
                  label="Work Mode"
                  required
                  placeholder="Select Work Mode"
                  value={workModeSelect}
                  options={WORK_MODE_OPTIONS}
                  onChange={handleWorkModeSelect}
                  error={step1Errors.workMode && workModeSelect !== "Other" ? step1Errors.workMode : undefined}
                />
                {workModeSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Work Mode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter work mode"
                      value={customWorkMode}
                      onChange={(e) => handleCustomWorkModeChange(e.target.value)}
                      className={step1Errors.workMode ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.workMode && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.workMode}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 4, Col 1: Country * */}
              <div>
                <CustomSelect
                  id="job-country-select"
                  label="Country"
                  required
                  searchable
                  searchPlaceholder="Search country..."
                  placeholder="Select Country"
                  value={countrySelect}
                  options={countryOptions}
                  onChange={handleCountrySelect}
                  error={step1Errors.country && countrySelect !== "Other" ? step1Errors.country : undefined}
                />
                {countrySelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter country name"
                      value={customCountry}
                      onChange={(e) => handleCustomCountryChange(e.target.value)}
                      className={step1Errors.country ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.country && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.country}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 4, Col 2: Preferred Location * */}
              <div>
                <CustomSelect
                  id="job-location-select"
                  label="Preferred Location"
                  required
                  searchable
                  searchPlaceholder="Search city or location..."
                  placeholder="Select Preferred Location"
                  value={locationSelect}
                  options={POPULAR_LOCATIONS}
                  onChange={handleLocationSelect}
                  error={step1Errors.location && locationSelect !== "Other" ? step1Errors.location : undefined}
                />
                {locationSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kathmandu, Nepal or specific city"
                      value={customLocation}
                      onChange={(e) => handleCustomLocationChange(e.target.value)}
                      className={step1Errors.location ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.location && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.location}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 5, Col 1: Target Joining Date */}
              <div>
                <CustomSelect
                  id="job-joining-date-select"
                  label="Joining Date"
                  searchable={false}
                  placeholder="Select Joining Timeframe (Optional)"
                  value={joiningDateSelect}
                  options={JOINING_DATE_OPTIONS}
                  onChange={handleJoiningDateSelect}
                  error={step1Errors.joiningDate && joiningDateSelect !== "Other" && joiningDateSelect !== "Specific Date" ? step1Errors.joiningDate : undefined}
                />
                {joiningDateSelect === "Specific Date" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Specific Joining Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={specificJoiningDate}
                      onChange={(e) => handleSpecificJoiningDateChange(e.target.value)}
                      className={step1Errors.joiningDate ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.joiningDate && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.joiningDate}</p>
                    )}
                  </div>
                )}
                {joiningDateSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Joining Details <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. After notice period, 2 weeks notice"
                      value={customJoiningDate}
                      onChange={(e) => handleCustomJoiningDateChange(e.target.value)}
                      className={step1Errors.joiningDate ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.joiningDate && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.joiningDate}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 5, Col 2: Hiring Process */}
              <div>
                <CustomSelect
                  id="job-hiring-process-select"
                  label="Hiring Process"
                  searchable={false}
                  placeholder="Select Hiring Process (Optional)"
                  value={hiringProcessSelect}
                  options={HIRING_PROCESS_OPTIONS}
                  onChange={handleHiringProcessSelect}
                  error={step1Errors.hiringProcess && hiringProcessSelect !== "Other" ? step1Errors.hiringProcess : undefined}
                />
                {hiringProcessSelect === "Other" && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Other Hiring Process <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Technical Rounds + Cultural Fit + CEO Discussion"
                      value={customHiringProcess}
                      onChange={(e) => handleCustomHiringProcessChange(e.target.value)}
                      className={step1Errors.hiringProcess ? inputErrorCls : inputCls}
                      autoFocus
                    />
                    {step1Errors.hiringProcess && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.hiringProcess}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 6, Col 1: Openings */}
              <div>
                <label htmlFor="job-openings" className={labelCls}>
                  Openings
                </label>
                <input
                  id="job-openings"
                  type="number"
                  name="openings"
                  min="1"
                  placeholder="1"
                  value={formData.openings}
                  onChange={(e) => {
                    handleChange(e);
                    if (step1Errors.openings) {
                      setStep1Errors((prev) => {
                        const n = { ...prev };
                        delete n.openings;
                        return n;
                      });
                    }
                  }}
                  className={step1Errors.openings ? inputErrorCls : inputCls}
                />
                {step1Errors.openings && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.openings}</p>
                )}
              </div>

              {/* Row 6, Col 2: Application Deadline * */}
              <div>
                <label htmlFor="job-deadline" className={labelCls}>
                  Application Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  id="job-deadline"
                  type="date"
                  name="deadline"
                  min={todayStr}
                  value={formData.deadline}
                  onChange={(e) => {
                    handleChange(e);
                    if (step1Errors.deadline) {
                      setStep1Errors((prev) => {
                        const n = { ...prev };
                        delete n.deadline;
                        return n;
                      });
                    }
                  }}
                  className={step1Errors.deadline ? inputErrorCls : inputCls}
                />
                {step1Errors.deadline && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{step1Errors.deadline}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Job Overview</label>
                <textarea name="overview" value={formData.overview} onChange={handleChange} rows={2} placeholder="e.g. Join our fast-growing engineering team building the next generation of hiring tools for South Asia." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Job Description *</label>
                <div className="h-[220px]">
                  <ReactQuill
                    value={formData.description}
                    onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                    theme="snow"
                    className="h-[85%]"
                    placeholder="e.g. We're looking for a Full Stack Developer to join our growing engineering team. You'll work closely with product and design to ship features end-to-end, own key parts of our codebase, and help mentor junior engineers..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className={labelCls}>Responsibilities</label>
                  <TagInput
                    value={formData.responsibilities}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, responsibilities: csv }))}
                    placeholder="Type a responsibility and press Enter, e.g. Lead sprint planning"
                  />
                </div>
                <div>
                  <label className={labelCls}>Requirements</label>
                  <TagInput
                    value={formData.requirements}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, requirements: csv }))}
                    placeholder="Type a requirement and press Enter, e.g. 3+ years experience"
                  />
                </div>
                <div>
                  <label className={labelCls}>Required Skills</label>
                  <TagInput
                    value={formData.requiredSkills}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, requiredSkills: csv }))}
                    placeholder="Type a skill and press Enter, e.g. React"
                  />
                </div>
                <div>
                  <label className={labelCls}>Preferred Skills</label>
                  <TagInput
                    value={formData.preferredSkills}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, preferredSkills: csv }))}
                    placeholder="Type a skill and press Enter, e.g. AWS"
                  />
                </div>
                <div>
                  <label className={labelCls}>Education</label>
                  <TagInput
                    value={formData.education}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, education: csv }))}
                    placeholder="Type a qualification and press Enter, e.g. Bachelor's in Computer Science"
                  />
                </div>
                <div>
                  <label className={labelCls}>Working Hours</label>
                  <TagInput
                    value={formData.workingHours}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, workingHours: csv }))}
                    placeholder="Type and press Enter, e.g. 10 AM - 6 PM"
                  />
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
                  <img src={resolveMediaUrl(companyProfile.companyLogo)} alt="" className="h-14 w-14 rounded-full object-cover bg-white shrink-0" />
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
                  <CurrencySelect
                    value={formData.currency}
                    currencies={currencies}
                    onChange={(code) => {
                      setCurrencyTouched(true);
                      setFormData((prev) => ({ ...prev, currency: code }));
                    }}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm text-gray-600">Period</label>
                  <select name="salaryPeriod" value={formData.salaryPeriod} onChange={handleChange} className={inputCls}>
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
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
                  <TagInput
                    value={formData.benefits}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, benefits: csv }))}
                    placeholder="Type a benefit and press Enter, e.g. Health insurance"
                  />
                </div>
                <div>
                  <label className={labelCls}>Perks</label>
                  <TagInput
                    value={formData.perks}
                    onChange={(csv) => setFormData((prev) => ({ ...prev, perks: csv }))}
                    placeholder="Type a perk and press Enter, e.g. Free lunch"
                  />
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
                  {formData.department && <span className="font-medium text-gray-700">Dept: {formData.department}</span>}
                  <span>{formData.workMode}</span>
                  <span>{formData.jobtype || "—"}</span>
                  <span>{formData.level || "—"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                  <div><p className="text-gray-400 text-xs">Salary</p><p className="font-medium">{previewSalary || "—"}</p></div>
                  <div><p className="text-gray-400 text-xs">Experience</p><p className="font-medium">{formData.experience || "—"}</p></div>
                  <div><p className="text-gray-400 text-xs">Openings</p><p className="font-medium">{formData.openings}</p></div>
                  <div><p className="text-gray-400 text-xs">Deadline</p><p className="font-medium">{formData.deadline || "—"}</p></div>
                </div>
                {(formData.joiningDate || formData.hiringProcess) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    {formData.joiningDate && (
                      <div><p className="text-gray-400 text-xs">Target Joining Date</p><p className="font-medium text-gray-700 dark:text-gray-200">{formData.joiningDate}</p></div>
                    )}
                    {formData.hiringProcess && (
                      <div><p className="text-gray-400 text-xs">Hiring Process</p><p className="font-medium text-gray-700 dark:text-gray-200">{formData.hiringProcess}</p></div>
                    )}
                  </div>
                )}
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
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={16} /> {step === 0 ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              {step < STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={mutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-primary text-white font-medium text-sm rounded-xl shadow-sm hover:shadow hover:bg-[#e66800] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
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
