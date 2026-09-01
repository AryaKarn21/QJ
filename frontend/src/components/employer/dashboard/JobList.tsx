import { MapPin, Clock, DollarSign, Users, PenSquare, MoreVertical, Trash2 } from "lucide-react";
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
  type: string;
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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getEmployerJobs();
        setJobs(data);
        setFilteredJobs(data);
      } catch (error) {
        console.error("Error fetching employer jobs:", error);
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
        return "bg-green-200 text-black";
      case "Inactive":
        return "bg-blue-200 text-black";
      case "Pending":
        return "bg-amber-200 text-black";
      case "Rejected":
        return "bg-red-200 text-black";
      default:
        return "bg-gray-300 text-black";
    }
  };

  return (
    <div
      className="min-h-screen overflow-auto bg-gray-50 p-6"
      style={{ maxHeight: "calc(100vh - 50px)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Search job titles or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Users size={20} />
            </div>
          </div>
          <div className="ml-4">
            <select
              className="border rounded-lg px-4 py-2"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="Newest">Newest First</option>
              <option value="Oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="flex w-full justify-end mb-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg text-primary font-semibold">
              Need to boost any Job Posts,&nbsp;
              <a
                href="https://wa.me/9849295360"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-green-600 hover:text-green-700"
              >
                <FaWhatsapp size={40} />
              </a>
            </h2>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job._id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{job.title}</h3>
                      <span className={`px-2 py-1 text-sm rounded-md ${statusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.status === "Rejected" && job.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {job.rejectionReason}</p>
                    )}
                    {job.status === "Pending" && (
                      <p className="text-xs text-gray-500 mt-1">Waiting for admin review</p>
                    )}

                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin size={16} className="mr-1" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock size={16} className="mr-1" />
                        <span>{job.type}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign size={16} className="mr-1" />
                        <span>{job.salary}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button>
                  <MoreVertical size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex space-x-6">
                  <div>
                    <div className="text-gray-600">Total Applicants</div>
                    <div className="flex items-center mt-1">
                      <span className="font-semibold">
                        {job.jobseekers?.length ?? 0}
                      </span>
                      <span className="ml-2 text-green-600 text-sm">
                        +{job.newApplicants || 0} new
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    className="flex items-center text-gray-600 hover:text-primary"
                    onClick={() =>
                      navigate(`/employer/jobs/${job._id}/applicants`)
                    }
                  >
                    <Users size={20} className="mr-2" />
                    View Applicants
                  </button>

                  <button
                    className="flex items-center text-gray-600 hover:text-primary"
                    onClick={() => navigate(`/employer/postjob/${job._id}`)}
                  >
                    <PenSquare size={20} className="mr-2" />
                    Edit Job
                  </button>
                  <button
                    className="flex items-center text-gray-600 hover:text-red-600"
                    onClick={() => handleDeleteJob(job._id)}
                    title="Delete Job"
                  >
                    <Trash2 size={20} className="mr-2" />
                    Delete
                  </button>

                  {(job.status === "Active" || job.status === "Inactive") && (
                    <select
                      value={job.status}
                      onChange={(e) =>
                        handleStatusChange(job._id, e.target.value)
                      }
                      className="border px-2 py-1 rounded-md text-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Closed">Closed</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredJobs.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              No jobs found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobList;