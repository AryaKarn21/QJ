import { MapPin, DollarSign, Users, PenSquare, Trash2, Send, Copy, PlusCircle, Search, Briefcase, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployerJobs, patchJob, deleteJob } from "../employerApi/api";
import { toast } from "react-toastify";
import { FaWhatsapp } from "react-icons/fa";

interface Job {
  _id: string;
  title: string;
  companyName: string;
  location: string;
  // The actual API field is `jobtype` (backend/models/Job.js) — this was
  // typed as `type` (which the API never sends) so the job type column
  // always silently rendered blank. Kept both so nothing already reading
  // the old (always-empty) `type` breaks; `jobtype` is what's real.
  type?: string;
  jobtype: string;
  createdAt: string;
  salary: string;
  jobseekers?: string[];
  newApplicants?: number;
  shortlisted?: number;
  interview?: number;
  status: string;
  rejectionReason?: string;
  logo?: string;
}

const JobList = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await getEmployerJobs();
        setJobs(data);
        setFilteredJobs(data);
      } catch (error) {
        console.error("Error fetching employer jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = [...jobs];

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(lower) ||
          job.location.toLowerCase().includes(lower)
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "Newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredJobs(filtered);
  }, [searchQuery, sortOrder, jobs]);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await patchJob(jobId, { status: newStatus });
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job._id === jobId ? { ...job, status: newStatus } : job
        )
      );
      toast.success("Job status updated successfully!");
    } catch (error) {
      console.error("Failed to update job status:", error);
      toast.error("Failed to update job status");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      try {
        await deleteJob(jobId);
        setJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
        setFilteredJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
        toast.success("Job deleted successfully!");
      } catch (error) {
        console.error("Error deleting job:", error);
        toast.error("Failed to delete job");
      }
    }
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Inactive":
        return "bg-yellow-100 text-yellow-700";
      case "Pending":
        return "bg-blue-100 text-blue-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      case "Closed":
        return "bg-red-100 text-red-700";
      case "Draft":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Draft -> Pending: the one status change an employer can make
  // themselves (see backend/controllers/employerController.js's editJob),
  // same "submit for admin review" transition as first posting a job.
  const handlePublishDraft = async (jobId: string) => {
    try {
      await patchJob(jobId, { status: "Pending" });
      setJobs((prevJobs) => prevJobs.map((job) => (job._id === jobId ? { ...job, status: "Pending" } : job)));
      toast.success("Job submitted for review.");
    } catch (error) {
      console.error("Failed to publish draft:", error);
      toast.error("Failed to publish job.");
    }
  };

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status === "Active").length;
  const pausedJobs = jobs.filter((j) => j.status === "Inactive").length;
  const closedJobs = jobs.filter((j) => j.status === "Closed" || j.status === "Rejected").length;

  const stats = [
    { label: "Total Jobs", value: totalJobs },
    { label: "Active", value: activeJobs },
    { label: "Paused", value: pausedJobs },
    { label: "Closed", value: closedJobs },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F3] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manage Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">View, edit and track all of your job postings</p>
          </div>
          <button
            onClick={() => navigate("/employer/postjob")}
            className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-colors flex-shrink-0"
          >
            <PlusCircle size={16} />
            Post New Job
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-2xl font-bold text-orange-500">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search job titles or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
            />
          </div>
          <select
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 flex-shrink-0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
          </select>
          <a
            href="https://wa.me/9849295360"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap"
            title="Chat with us on WhatsApp to boost your job posts"
          >
            <FaWhatsapp size={18} />
            Boost a job post
          </a>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-1/2 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no jobs posted at all */}
        {!loading && jobs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Briefcase size={24} className="text-orange-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No jobs posted yet</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">Get started by posting your first job listing.</p>
            <button
              onClick={() => navigate("/employer/postjob")}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              <PlusCircle size={16} />
              Post your first job
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && jobs.length > 0 && filteredJobs.length === 0 && (
          <div className="text-center text-gray-500 py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            No jobs found matching your criteria.
          </div>
        )}

        {/* Job cards */}
        {!loading && filteredJobs.length > 0 && (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left: title, meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">{job.title}</h3>
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        {job.jobtype}
                      </span>
                    </div>

                    {job.status === "Rejected" && job.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1.5">Reason: {job.rejectionReason}</p>
                    )}
                    {job.status === "Pending" && (
                      <p className="text-xs text-gray-500 mt-1.5">Waiting for admin review</p>
                    )}
                    {job.status === "Draft" && (
                      <p className="text-xs text-gray-500 mt-1.5">Not submitted yet — finish and publish when ready.</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={14} />
                        Posted {new Date(job.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        {job.salary}
                      </span>
                    </div>
                  </div>

                  {/* Center: applicant chips + status */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
                      {job.jobseekers?.length ?? 0} Applicants
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {job.shortlisted ?? 0} Shortlisted
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadgeClass(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <button
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-600 transition-colors"
                    onClick={() => navigate(`/employer/jobs/${job._id}/applicants`)}
                  >
                    <Users size={16} />
                    View Applicants
                  </button>

                  <button
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-600 transition-colors"
                    onClick={() => navigate(`/employer/postjob/${job._id}`)}
                  >
                    <PenSquare size={16} />
                    Edit Job
                  </button>

                  {job.status === "Draft" && (
                    <button
                      className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                      onClick={() => handlePublishDraft(job._id)}
                      title="Submit this draft for admin review"
                    >
                      <Send size={15} />
                      Publish
                    </button>
                  )}

                  <button
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-600 transition-colors"
                    onClick={() => navigate(`/employer/postjob?duplicateFrom=${job._id}`)}
                    title="Create a new job pre-filled from this one"
                  >
                    <Copy size={15} />
                    Duplicate
                  </button>

                  <button
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors"
                    onClick={() => handleDeleteJob(job._id)}
                    title="Delete Job"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>

                  {(job.status === "Active" || job.status === "Inactive") && (
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job._id, e.target.value)}
                      className="ml-auto border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Closed">Closed</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobList;
