import React, { useEffect, useState } from "react";
import { Search, Pencil, Trash2, X } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { fetchJobs, updateJob, deleteJob } from "./adminApi/api";
import { fetchJobCategories, PublicJobCategory } from "../../api/jobCategoryApi";
import { AxiosError } from "axios";

interface Job {
  _id: string;
  title: string;
  country: string;
  description: string;
  deadline: string;
  location: string;
  jobtype: string;
  salary: string;
  experience: string;
  level: string;
  jobcategory: string;
  openings: number;
  istrending: boolean;
  status: string;
  employer: {
    name: string;
    email?: string;
    companyLogo?: string;
  };
  createdAt?: string;
  views?: { ip: string; date: string; _id: string }[];
  jobseekers?: string[];
  likes?: string[];
  dislikes?: string[];
}

const JobManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<Partial<Job>>({});
  // Real, admin-managed categories — this dropdown used to hard-code its
  // own copy of the list, so a category created via Job Category
  // Management could never actually be assigned to a job.
  const [categories, setCategories] = useState<PublicJobCategory[]>([]);

  useEffect(() => {
    fetchJobCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to fetch job categories", err));
  }, []);

  const getJobs = async () => {
    try {
      const data = await fetchJobs(page, 6, search);
      setJobs(data.jobs);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      getJobs();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search, page]);

  const handleEditClick = (job: Job) => {
    setEditingJob(job);
    setFormData({
      ...job,
      deadline: new Date(job.deadline).toISOString().split("T")[0],
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    try {
      await updateJob(editingJob._id, {
        ...formData,
        deadline: new Date(formData.deadline!),
        openings: Number(formData.openings),
      });
        alert("Job updated successfully");
      setEditingJob(null);
      getJobs();
    } catch (err) {
      console.error("Error updating job:", err);
      alert("Failed to update job");
    }
  };
    //handle delete
    const handleDelete = async (jobId: string) => {
      if (!window.confirm("Are you sure you want to delete this job?")) return;
      try {
        await deleteJob(jobId);
        setJobs((prev) => prev.filter((job) => job._id !== jobId));
      } catch (err) {
        const error = err as AxiosError;
        alert(error.response?.data || "Failed to delete job.");
      }
    }
    
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4 h-[calc(100vh-64px)] overflow-y-auto w-full">
      <h2 className="text-2xl font-semibold mb-6">Job Management</h2>

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by employer..."
            className="pl-10 pr-4 py-2 border rounded-lg w-full"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <div className="max-w-[800px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Employer</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Experience</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Openings</th>
              <th className="px-4 py-3">Trending</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Likes</th>
              <th className="px-4 py-3">Dislikes</th>
              <th className="px-4 py-3">Applicants</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={18} className="text-center text-sm py-60 px-30 font-medium text-gray-400">
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{job.title}</td>
                  <td className="px-4 py-3">{job.country}</td>
                  <td className="px-4 py-3">{job.employer?.name}</td>
                  <td className="px-4 py-3">{job.location}</td>
                  <td className="px-4 py-3">{job.jobtype}</td>
                  <td className="px-4 py-3">{job.salary}</td>
                  <td className="px-4 py-3">{job.experience}</td>
                  <td className="px-4 py-3">{job.jobcategory}</td>
                  <td className="px-4 py-3">{job.level}</td>
                  <td className="px-4 py-3">{new Date(job.deadline).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{job.openings}</td>
                  <td className="px-4 py-3">{job.istrending ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{job.status}</td>
                  <td className="px-4 py-3">{new Date(job.createdAt || "").toLocaleDateString()}</td>
                  <td className="px-4 py-3">{job.views?.length || 0}</td>
                  <td className="px-4 py-3">{job.likes?.length || 0}</td>
                  <td className="px-4 py-3">{job.dislikes?.length || 0}</td>
                  <td className="px-4 py-3">{job.jobseekers?.length || 0}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditClick(job)} className="text-blue-600 hover:text-blue-800">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(job._id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Edit Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[80%] max-w-3xl p-6 rounded shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingJob(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-6">Edit Job - {editingJob.title}</h3>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "Job Title", name: "title" },
                  { label: "Location", name: "location" },
                  { label: "Salary", name: "salary" },
                  { label: "Experience", name: "experience" },
                ].map(({ label, name }) => (
                  <div key={name}>
                    <label className="block mb-1 font-medium">{label}</label>
                    <input
                      name={name}
                      value={(formData as any)[name] || ""}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                ))}
                
                <div>
                  <label className="block mb-1 font-medium">Job Category</label>
                  <select
                    name="jobcategory"
                    value={formData.jobcategory || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  >
                    <option value="">Select a category</option>
                    {/* Keeps a job's existing category selectable even if
                        it no longer matches any current JobCategory
                        (renamed/deleted, or a legacy hard-coded name) —
                        editing a job should never silently blank it out. */}
                    {formData.jobcategory && !categories.some((c) => c.name === formData.jobcategory) && (
                      <option value={formData.jobcategory}>{formData.jobcategory}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Job Type</label>
                  <select
                    name="jobtype"
                    value={formData.jobtype || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded"
                  >
                    <option value="">Select Job Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Level</label>
                  <select
                    name="level"
                    value={formData.level || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded"
                  >
                    <option value="">Select Level</option>
                    <option value="Internship">Internship</option>
                    <option value="Fresher">Fresher</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Deadline</label>
                  <input
                    name="deadline"
                    type="date"
                    value={formData.deadline || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Openings</label>
                  <input
                    name="openings"
                    type="number"
                    min={1}
                    value={formData.openings || 1}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Description</label>
                  <div className="h-[250px]">
                <ReactQuill
                  value={formData.description || ""}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, description: val }))
                  }
                  className="bg-white h-[90%]"
                  theme="snow"
                />
              </div>
              </div>

              <div className="flex justify-end mt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Update Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagement;
